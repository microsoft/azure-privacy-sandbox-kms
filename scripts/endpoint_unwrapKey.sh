#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
source $REPO_ROOT/scripts/tools/endpoint_retry.sh

ATTESTATION=$(<$REPO_ROOT/scripts/res/sample_attestation.json)
WRAPPING_KEY=$(jq -Rs . < $REPO_ROOT/scripts/res/sample_wrapping_key.pem)

curl "$KMS_URL/app/unwrapKey" \
    -X POST \
    --cacert ${KEYS_DIR}/service_cert.pem \
    --cert ${KEYS_DIR}/member0_cert.pem \
    --key ${KEYS_DIR}/member0_privk.pem \
    -H "Content-Type: application/json" \
    -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY, \"wrapped\":\"\", \"wrappedKid\":\"$WRAPPED_KID\"}" \
    | jq
