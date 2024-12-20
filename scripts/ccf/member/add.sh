#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-add() {
    set -e

    source $REPO_ROOT/scripts/ccf/az-cleanroom-aci/setup.sh && az-cleanroom-aci-setup
    source $REPO_ROOT/scripts/ccf/propose.sh
    source $REPO_ROOT/scripts/ccf/member/info.sh
    source $REPO_ROOT/scripts/ccf/member/id.sh
    source $REPO_ROOT/scripts/ccf/member/use.sh

    MEMBER_NAME=${1:-$MEMBER_NAME}
    if [ -z "$MEMBER_NAME" ]; then
        read -p "Enter member name: " MEMBER_NAME
    fi
    export MEMBER_NAME
    USE_AKV=${USE_AKV:-false}

    # Hopefully we will have a single command for this eventually, e.g.
    #   az cleanroom governance member up $MEMBER_NAME

    if [[ $USE_AKV == false ]]; then
        # Generate the member identity
        (cd $WORKSPACE && az cleanroom governance member keygenerator-sh | bash -s -- --name $MEMBER_NAME)
    else
        # Create a key in AKV and download the cert for proposing
        az keyvault certificate create \
            --vault-name $AKV_VAULT_NAME \
            --name $MEMBER_NAME \
            --policy "${AKV_POLICY:-$(cat $REPO_ROOT/scripts/akv/key_policy.json | jq -c .)}"
        rm -rf $WORKSPACE/${MEMBER_NAME}_cert.pem
        az keyvault certificate download \
            --vault-name $AKV_VAULT_NAME \
            --name $MEMBER_NAME \
            --file $WORKSPACE/${MEMBER_NAME}_cert.pem
    fi

    # Propose adding the member to the network
    MEMBER_CERT=$(jq -Rs . < $WORKSPACE/${MEMBER_NAME}_cert.pem) \
        envsubst < $REPO_ROOT/governance/proposals/set_member.json | jq \
            > $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json
    ccf-propose $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json

    # Check if the proposal is accepted, otherwise early out with instructions to wait
    if [ `ccf-member-info | jq -r '.status'` != "Accepted" ]; then
        if [ `ccf-member-info | jq -r '.status'` == "Open" ]; then
            echo -e \
            "Proposal submitted, await sufficient votes for members to be accepted\n" \
            "Check member status with:\n" \
            "$REPO_ROOT/scripts/ccf/member/info.sh"
            return 0
        else
            return 1
        fi
    fi

    ( # Use a subshell to temporarily operate as the new member
        ccf-member-use $MEMBER_NAME

        # Otherwise activate member
        state_digest_file=$(mktemp)
        ccf-sign `mktemp` state_digest \
            | curl -s $KMS_URL/gov/members/state-digests/`ccf-member-id`:update?api-version=2024-07-01 \
                -X POST \
                -H "Content-Type: application/cose" \
                --data-binary @- \
                --cacert $KMS_SERVICE_CERT_PATH \
                | jq > $state_digest_file

        ccf-sign $state_digest_file ack \
            | curl -s $KMS_URL/gov/members/state-digests/$(ccf-member-id):ack?api-version=2024-07-01 \
                -H "Content-Type: application/cose" \
                --data-binary @- \
                --cacert $KMS_SERVICE_CERT_PATH
    )

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-add "$@"
fi
