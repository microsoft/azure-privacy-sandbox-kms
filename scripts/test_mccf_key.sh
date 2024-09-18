#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -e
export REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.."; pwd)
cd $REPO_ROOT

# CCF_NAME ?= "500dev10"
# PYTHON_VENV := .venv_ccf_sandbox
# KMS_WORKSPACE ?= ${PWD}/workspace
# KMS_URL ?= https://acceu-bingads-502-1.confidential-ledger.azure.com
# KEYS_DIR ?= ${KMS_WORKSPACE}/sandbox_common
# RUN_BACK ?= true
# CCF_PLATFORM ?= virtual

. ./scripts/setup_mCCF.sh

# mkdir -p $KEYS_DIR
# echo $PUBLIC_CERT
# echo $PRIVATE_CERT
export CCF_NAME="acceu-bingads-502-1"
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export IDENTITY_URL=https://identity.confidential-ledger.core.azure.com/ledgerIdentity/${CCF_NAME}
# echo $KMS_URL
# echo -n "$PUBLIC_CERT_PEM" > $PUBLIC_CERT
# echo -n "$PRIVATE_CERT_PEM" > $PRIVATE_CERT
# make get-service-cert

echo "Generate a new key item"
set -x
curl ${KMS_URL}/app/refresh -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'


echo "Getting the latest public key"
echo "Waiting until receipt is ready"
while ! [[ $response_code -eq 200 ]]; do
    sleep 1
    response_code=$(curl ${KMS_URL}/app/pubkey --cacert ${KEYS_DIR}/service_cert.pem -k -s -o /dev/null -w "%{http_code}")
done
curl ${KMS_URL}/app/pubkey --cacert ${KEYS_DIR}/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'

echo "Get the latest private key (JWT)"
echo "Waiting until receipt is ready"
while ! [[ $response_code -eq 200 ]]; do
    sleep 1
    response_code=$(curl -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY}" -s -o /dev/null -w "%{http_code}")
done
wrapped_resp=$(curl $KMS_URL/app/key -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY}"  | jq)
echo $wrapped_resp
kid=$(echo $wrapped_resp | jq '.wrappedKid' -r)
echo $kid
wrapped=$(echo $wrapped_resp | jq '.wrapped' -r)
echo $wrapped

echo "Unwrap key with attestation (JWT)"
echo "Waiting until receipt is ready"
while ! [[ $response_code -eq 200 ]]; do
    sleep 1
    response_code=$(curl $KMS_URL/app/unwrapKey -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY, \"wrapped\":\"$wrapped\", \"wrappedKid\":\"$kid\"}" -s -o /dev/null -w "%{http_code}")
done
curl $KMS_URL/app/unwrapKey -X POST --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -d "{\"attestation\":$ATTESTATION, \"wrappingKey\":$WRAPPING_KEY, \"wrapped\":\"$wrapped\", \"wrappedKid\":\"$kid\"}" | jq