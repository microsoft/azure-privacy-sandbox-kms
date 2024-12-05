#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-add() {
    set -e
    source $REPO_ROOT/scripts/ccf/propose.sh
    source $REPO_ROOT/scripts/ccf/member/info.sh
    source $REPO_ROOT/scripts/ccf/member/id.sh

    MEMBER_NAME=${1:-$MEMBER_NAME}
    if [ -z "$MEMBER_NAME" ]; then
        read -p "Enter member name: " MEMBER_NAME
    fi
    export MEMBER_NAME
    USE_AKV=${USE_AKV:-false}

    # Hopefully we will have a single command for this eventually, e.g.
    #   az cleanroom governance member up $MEMBER_NAME
    # but for now:

    if [[ $USE_AKV == false ]]; then
        # Generate the member identity
        (cd $WORKSPACE && az cleanroom governance member keygenerator-sh | bash -s -- --name $MEMBER_NAME)
    else
        # Create a key in AKV and download the cert for proposing
        az keyvault certificate create \
            --vault-name $AKV_VAULT_NAME \
            --name $MEMBER_NAME-cert \
            --policy "${AKV_POLICY:-$(az keyvault certificate get-default-policy)}"
        az keyvault certificate download \
            --vault-name $AKV_VAULT_NAME \
            --name $MEMBER_NAME-cert \
            --file $WORKSPACE/${MEMBER_NAME}_cert.pem
    fi

    # Propose adding the member to the network
    MEMBER_CERT=$(jq -Rs . < $WORKSPACE/${MEMBER_NAME}_cert.pem) \
        envsubst < $REPO_ROOT/governance/proposals/set_member.json | jq \
            > $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json
    ccf-propose $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json

    # Check if the proposal is accepted, otherwise early out with instructions to wait
    if [ `ccf-member-info | jq -r '.status'` != "Accepted" ]; then
        echo -e \
        "Proposal submitted, await sufficient votes for members to be accepted\n" \
        "Check member status with:\n" \
        "$REPO_ROOT/scripts/ccf/member/info.sh"
        return 0
    fi

    # Otherwise activate member
    KMS_MEMBER_CERT_PATH=$WORKSPACE/${MEMBER_NAME}_cert.pem \
    KMS_MEMBER_PRIVK_PATH=$WORKSPACE/${MEMBER_NAME}_privk.pem \
        ccf-sign `mktemp` state_digest \
            | curl -s $KMS_URL/gov/members/state-digests/`ccf-member-id`:update?api-version=2024-07-01 \
                -X POST \
                -H "Content-Type: application/cose" \
                --data-binary @- \
                --cacert $KMS_SERVICE_CERT_PATH \
                --key ${WORKSPACE}/${MEMBER_NAME}_privk.pem \
                --cert ${WORKSPACE}/${MEMBER_NAME}_cert.pem \
                | jq

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-add "$@"
fi