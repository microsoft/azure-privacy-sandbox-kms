#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
source $REPO_ROOT/scripts/tools/endpoint_retry.sh

ATTESTATION=$(<$REPO_ROOT/scripts/data/sample_attestation.json)
WRAPPING_KEY=$(jq -Rs . < $REPO_ROOT/scripts/data/sample_wrapping_key.pem)
TOKEN=$(curl -k -X POST http://localhost:3000/token | jq -r '.access_token')

curl "$KMS_URL/app/unwrapKey" \
    -X POST \
    --cacert ${WORKSPACE}/sandbox_common/service_cert.pem \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY, \"wrapped\":\"\", \"wrappedKid\":\"$WRAPPED_KID\"}" \
    | jq
