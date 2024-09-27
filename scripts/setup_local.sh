#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

export KMS_URL=https://127.0.0.1:8000
export CCF_NAME=""
export KEYS_DIR=${PWD}/workspace/sandbox_common
export PUBLIC_CERT=${KEYS_DIR}/member0_cert.pem
export PRIVATE_CERT=${KEYS_DIR}/member0_privk.pem
export SERVICE_CERT=${KEYS_DIR}/service_cert.pem
export WRAPPING_KEY=$(jq -Rs . < test/data-samples/publicWrapKey.pem)
export ATTESTATION=$(<test/attestation-samples/snp.json)
export AUTHORIZATION=$(./scripts/authorization_header.sh)