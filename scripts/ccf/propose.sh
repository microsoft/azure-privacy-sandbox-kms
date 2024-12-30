#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-propose() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh

    proposal=$1
    USE_AKV=${USE_AKV:-false}

    source $REPO_ROOT/scripts/ccf/get-primary.sh
    KMS_PRIMARY=$(ccf-get-primary $KMS_URL)

    echo "Proposing: $proposal" >&2
    echo "  to $KMS_PRIMARY" >&2
    echo "    cert: $KMS_SERVICE_CERT_PATH" >&2

    echo "  as $KMS_MEMBER_CERT_PATH" >&2
    if [[ $USE_AKV == false ]]; then
        echo "  using local key $KMS_MEMBER_PRIVK_PATH" >&2
    else
        echo "  using AKV key $AKV_KEY_NAME from $AKV_VAULT_NAME" >&2
    fi

    resp=$(mktemp)
    ccf-sign $proposal \
        | curl $KMS_PRIMARY/gov/proposals \
            --cacert $KMS_SERVICE_CERT_PATH \
            --data-binary @- \
            -H "Content-Type: application/cose" \
            -s \
            -w '\n' \
                | tee $resp | jq >&2

    if jq -e '.error' $resp >/dev/null; then
        exit 1
    fi

    cat $resp

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-propose "$@"
fi