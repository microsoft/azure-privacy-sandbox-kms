#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

ccf-propose() {
    set -e

    source $REPO_ROOT/scripts/ccf/sign.sh
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

    ccf-sign $proposal \
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