#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

# Usage: Set the common environment variables using `. ./scripts/setup_local.sh` or `. ./scripts/setup_mCCF.sh`,
#        and then run this script.

set -e
export REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.."; pwd)
cd $REPO_ROOT

TEST_WORKSPACE=$KMS_WORKSPACE/test-curl
mkdir -p $TEST_WORKSPACE

echo "Generate a new key item"
curl ${KMS_URL}/app/refresh -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'


echo "Getting the latest public key"
echo "Waiting until receipt is ready"

timeout=180

response_code=000
start_time=$(date +%s)
while ! [[ $response_code -eq 200 ]]; do
    response_code=$(curl ${KMS_URL}/app/pubkey --cacert ${KEYS_DIR}/service_cert.pem -s -o $TEST_WORKSPACE/pubkey_resp.json -w "%{http_code}")

    elapsed_time=$(($(date +%s) - start_time))
    if [ "$elapsed_time" -ge "$timeout" ]; then
        echo "Total timeout of $timeout seconds exceeded. Exiting..."
        exit 1
    fi
    sleep 1
done
cat $TEST_WORKSPACE/pubkey_resp.json
echo ""

echo "Get the latest private key (JWT)"
echo "Waiting until receipt is ready"
response_code=000
start_time=$(date +%s)
while ! [[ $response_code -eq 200 ]]; do
    response_code=$(curl $KMS_URL/app/key -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY}" -s -o $TEST_WORKSPACE/key_resp.json -w "%{http_code}")

    elapsed_time=$(($(date +%s) - start_time))
    if [ "$elapsed_time" -ge "$timeout" ]; then
        echo "Total timeout of $timeout seconds exceeded. Exiting..."
        exit 1
    fi
    sleep 1
done

key_resp=$(cat $TEST_WORKSPACE/key_resp.json | jq)
echo $key_resp
kid=$(echo $key_resp | jq '.wrappedKid' -r)
echo $kid
wrapped=$(echo $key_resp | jq '.wrapped' -r)
echo $wrapped

echo "Unwrap key with attestation (JWT)"
echo "Waiting until receipt is ready"
response_code=000
start_time=$(date +%s)
while ! [[ $response_code -eq 200 ]]; do
    response_code=$(curl $KMS_URL/app/unwrapKey -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY, \"wrapped\":\"$wrapped\", \"wrappedKid\":\"$kid\"}" -s -o $TEST_WORKSPACE/unwrap_key_resp.json -w "%{http_code}")

    elapsed_time=$(($(date +%s) - start_time))
    if [ "$elapsed_time" -ge "$timeout" ]; then
        echo "Total timeout of $timeout seconds exceeded. Exiting..."
        exit 1
    fi
    sleep 1
done

echo "Result:"
cat $TEST_WORKSPACE/unwrap_key_resp.json

echo ""
echo "OK"