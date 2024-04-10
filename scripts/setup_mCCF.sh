#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -euo pipefail
export CCF_PLATFORM=virtual
export MEMBER_COUNT=1
export KMS_WORKSPACE=${PWD}/workspace
export CCF_NAME="acceu-bingads-500dev10"
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export KEYS_DIR=${PWD}/vol
export PUBLIC_CERT=${KEYS_DIR}/member0_cert.pem
export PRIVATE_CERT=${KEYS_DIR}/member0_privk.pem
export SERVICE_CERT=${KEYS_DIR}/service_cert.pem
export WRAPPING_KEY=$(jq -Rs . < test/data-samples/publicWrapKey.pem)
export ATTESTATION=$(<test/attestation-samples/snp.json)
