#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
source $REPO_ROOT/scripts/tools/endpoint_retry.sh

ATTESTATION=$(<old/test/attestation-samples/snp.json)

QUERY_STRING=""
if [ -n "$KID" ]; then
    QUERY_STRING="?kid=${KID}"
fi

curl "$KMS_URL/app/key${QUERY_STRING}" \
    -X POST \
    --cacert ${KEYS_DIR}/service_cert.pem \
    --cert ${KEYS_DIR}/member0_cert.pem \
    --key ${KEYS_DIR}/member0_privk.pem \
    -H "Content-Type: application/json" \
    -d "{\"attestation\":$ATTESTATION}" \
    | jq
