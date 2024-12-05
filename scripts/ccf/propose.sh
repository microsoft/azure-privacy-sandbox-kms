#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

sign_proposal() {

    proposal=$1

    if [[ $USE_AKV == false ]]; then
        ccf_cose_sign1 \
            --content $proposal \
            --signing-cert ${KMS_MEMBER_CERT_PATH} \
            --signing-key ${KMS_MEMBER_PRIVK_PATH} \
            --ccf-gov-msg-type proposal \
            --ccf-gov-msg-created_at $(date -Is)
    else
        creation_time=$(date -u +"%Y-%m-%dT%H:%M:%S")
        bearer_token=$( \
            az account get-access-token \
            --resource https://vault.azure.net \
            --query accessToken --output tsv \
        )
        signature=$(mktemp)
        ccf_cose_sign1_prepare \
            --ccf-gov-msg-type proposal \
            --ccf-gov-msg-created_at $creation_time \
            --content $proposal \
            --signing-cert ${KMS_MEMBER_CERT_PATH} | \
            curl -X POST -s \
                -H "Authorization: Bearer $bearer_token" \
                -H "Content-Type: application/json" \
                "${AKV_URL}/keys/${AKV_KEY_NAME}/sign?api-version=7.2" \
                -d @- > $signature
        ccf_cose_sign1_finish \
            --ccf-gov-msg-type proposal \
            --ccf-gov-msg-created_at $creation_time \
            --content $proposal \
            --signing-cert ${KMS_MEMBER_CERT_PATH} \
            --signature $signature
        rm -rf $signature
    fi
}

ccf-propose() {
    set -e

    proposal=$1
    USE_AKV=${USE_AKV:-false}

    echo "Proposing: $proposal"
    echo "  to $KMS_URL"
    echo "    cert: $KMS_SERVICE_CERT_PATH"

    echo "  as $KMS_MEMBER_CERT_PATH"
    if [[ $USE_AKV == false ]]; then
        echo "  using local key $KMS_MEMBER_PRIVK_PATH"
    else
        echo "  using AKV key $AKV_KEY_NAME from $AKV_VAULT_NAME"
    fi

    sign_proposal $proposal \
        | curl $KMS_URL/gov/proposals \
            --cacert $KMS_SERVICE_CERT_PATH \
            --data-binary @- \
            -H "Content-Type: application/cose" \
            -s \
            -w '\n' \
                | jq

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-propose "$@"
fi