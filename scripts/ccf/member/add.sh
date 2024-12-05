#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-add() {
    set -e
    source $REPO_ROOT/scripts/ccf/propose.sh

    MEMBER_NAME=${MEMBER_NAME:-$1}
    if [ -z "$MEMBER_NAME" ]; then
        read -p "Enter member name: " MEMBER_NAME
    fi
    export MEMBER_NAME

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
            --file $WORKSPACE/$MEMBER_NAME_cert.pem
    fi

    # Propose adding the member to the network
    MEMBER_CERT=$(cat $WORKSPACE/$MEMBER_NAME_cert.pem) \
        envsubst $REPO_ROOT/governance/proposals/set_member.json | jq \
            > $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json
    ccf-propose $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json

    # Check if the proposal is accepted, otherwise early out with instructions to wait
    # TODO: Implement

    # Otherwise activate member
    ccf-sign empty_file | \
        curl $KMS_URL/gov/members/state-digests/${MEMBER_NAME}:update?api-version=2024-07-01 \
            -X POST -s \
            --cacert $KMS_SERVICE_CERT_PATH \
            --cert $KMS_MEMBER_CERT_PATH \
            --key $KMS_MEMBER_PRIVK_PATH \
             | jq

    # CLEANROOM BASED SOLUTION -------------------------------------------------

    # # Ensure a governance client is running
    # if ! az cleanroom governance client show; then
    #     export CLEANROOM_GOV_CLIENT_NAME="$(curl -s -k $KMS_URL/gov/members | jq -r 'keys[0]')"
    #     az cleanroom governance client deploy \
    #         --ccf-endpoint $KMS_URL \
    #         --service-cert $KMS_SERVICE_CERT_PATH \
    #         --name $CLEANROOM_GOV_CLIENT_NAME \
    #         --signing-cert $KMS_MEMBER_CERT_PATH \
    #         --signing-key $KMS_MEMBER_PRIVK_PATH
    # fi

    # az cleanroom governance member add --certificate $WORKSPACE/${MEMBER_NAME}_cert.pem --identifier $MEMBER_NAME

    # az cleanroom governance client deploy \
    #     --ccf-endpoint $KMS_URL \
    #     --service-cert $KMS_SERVICE_CERT_PATH \
    #     --name $MEMBER_NAME \
    #     --signing-cert $KMS_MEMBER_CERT_PATH \
    #     --signing-key $KMS_MEMBER_PRIVK_PATH

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-add "$@"
fi