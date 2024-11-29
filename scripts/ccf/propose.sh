#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-propose() {
    set -e

    echo "Proposing: $1"
    echo "  to $KMS_URL"
    echo "    cert: $KMS_SERVICE_CERT_PATH"
    echo "  as $KMS_MEMBER_CERT_PATH"
    ccf_cose_sign1 \
        --content $1 \
        --signing-cert ${KMS_MEMBER_CERT_PATH} \
        --signing-key ${KMS_MEMBER_PRIVK_PATH} \
        --ccf-gov-msg-type proposal \
        --ccf-gov-msg-created_at $(date -Is) \
            | curl $KMS_URL/gov/proposals -k -H "Content-Type: application/cose" \
            --data-binary @- \
            -s \
            --cacert $KMS_SERVICE_CERT_PATH -w '\n' \
                | jq

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-propose "$@"
fi