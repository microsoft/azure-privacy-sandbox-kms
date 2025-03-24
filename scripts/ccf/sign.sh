#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

# This script outputs a COSE Sign1 document, switching on the env variable
# `USE_AKV`.
#  - In the local key case, doing a simple one step signing.
#  - In the AKV key case, using the two step process which prepares the document
#    given the payload and signing cert, then uses AKV to sign the JSON output, and
#    then finally calling finish to output the final COSE Sign1 document.

ccf-sign() {

    content=$1
    msg_type=${2:-"proposal"}
    extra_args="${@:3}"
    USE_AKV=${USE_AKV:-false}

    if [[ $USE_AKV == false ]]; then
        ccf_cose_sign1 \
            --content $content \
            --signing-cert ${KMS_MEMBER_CERT_PATH} \
            --signing-key ${KMS_MEMBER_PRIVK_PATH} \
            --ccf-gov-msg-type $msg_type \
            --ccf-gov-msg-created_at $(date -Is) \
            $extra_args
    else
        creation_time=$(date -u +"%Y-%m-%dT%H:%M:%S")
        bearer_token=$( \
            az account get-access-token \
            --resource https://vault.azure.net \
            --query accessToken --output tsv \
        )
        signature=$(mktemp)
        payload=$(ccf_cose_sign1_prepare \
            --ccf-gov-msg-type $msg_type \
            --ccf-gov-msg-created_at $creation_time \
            --content $content \
            --signing-cert ${KMS_MEMBER_CERT_PATH} \
            $extra_args)
        curl -X POST -s \
            -H "Authorization: Bearer $bearer_token" \
            -H "Content-Type: application/json" \
            "${AKV_URL}/keys/${AKV_KEY_NAME}/sign?api-version=7.2" \
            -d $payload > $signature
        ccf_cose_sign1_finish \
            --ccf-gov-msg-type $msg_type \
            --ccf-gov-msg-created_at $creation_time \
            --content $content \
            --signing-cert ${KMS_MEMBER_CERT_PATH} \
            --signature $signature \
            $extra_args
        rm -rf $signature
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-sign "$@"
fi
