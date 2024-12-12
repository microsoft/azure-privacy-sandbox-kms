#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-use() {
    MEMBER_NAME=${1:-$MEMBER_NAME}
    if [ -z "$MEMBER_NAME" ]; then
        read -p "Enter member name: " MEMBER_NAME
    fi
    export MEMBER_NAME

    export KMS_MEMBER_CERT_PATH=${WORKSPACE}/${MEMBER_NAME}_cert.pem
    export KMS_MEMBER_PRIVK_PATH=${WORKSPACE}/${MEMBER_NAME}_privk.pem
    export AKV_KEY_NAME=$MEMBER_NAME
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-use "$@"

    jq -n '{
        KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
        KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH,
        AKV_KEY_NAME: env.AKV_KEY_NAME
    }'
fi
