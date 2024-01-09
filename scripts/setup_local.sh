#!/bin/bash

set -euo pipefail
export KMS_URL=https://127.0.0.1:8000/
export CCF_NAME=""
export KEYS_DIR=${PWD}/workspace/sandbox_common
export PUBLIC_CERT=${KEYS_DIR}/member0_cert.pem
export PRIVATE_CERT=${KEYS_DIR}/member0_privk.pem
export SERVICE_CERT=${KEYS_DIR}/service_cert.pem
