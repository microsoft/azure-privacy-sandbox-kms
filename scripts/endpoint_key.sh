#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
source $REPO_ROOT/scripts/tools/endpoint_retry.sh

ATTESTATION=$(<$REPO_ROOT/scripts/data/sample_attestation.json)
TOKEN=$(curl -k -X POST http://localhost:3000/token | jq -r '.access_token')

QUERY_STRING=""
if [ -n "$KID" ]; then
    QUERY_STRING="?kid=${KID}"
fi

curl "$KMS_URL/app/key${QUERY_STRING}" \
    -X POST \
    --cacert ${WORKSPACE}/sandbox_common/service_cert.pem \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"attestation\":$ATTESTATION}" \
    | jq
