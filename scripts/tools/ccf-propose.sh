#!/bin/bash

set -e

ccf_propose() {
    echo "Proposing: $1"
    ccf_cose_sign1 \
        --content $1 \
        --signing-cert $WORKSPACE/sandbox_common/member0_cert.pem \
        --signing-key $WORKSPACE/sandbox_common/member0_privk.pem \
        --ccf-gov-msg-type proposal \
        --ccf-gov-msg-created_at $(date -Is) \
            | curl $KMS_URL/gov/proposals -k -H "Content-Type: application/cose" \
            --data-binary @- \
            -s \
            --cacert $WORKSPACE/sandbox_common/service_cert.pem -w '\n' \
                | jq
}