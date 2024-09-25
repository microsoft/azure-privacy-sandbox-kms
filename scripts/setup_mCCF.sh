#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

export AUTHORIZATION="Bearer $ACCESS"
export CCF_NAME="${CCF_NAME:-yourCcfName}"
export CCF_PLATFORM=virtual
export MEMBER_COUNT=1
export KMS_WORKSPACE=${PWD}/workspace
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export IDENTITY_URL=https://identity.confidential-ledger.core.azure.com/ledgerIdentity/${CCF_NAME}
export KEYS_DIR=${PWD}/vol
export PUBLIC_CERT=${KEYS_DIR}/member0_cert.pem
export PRIVATE_CERT=${KEYS_DIR}/member0_privk.pem
export SERVICE_CERT=${KEYS_DIR}/service_cert.pem
export WRAPPING_KEY=$(jq -Rs . < test/data-samples/publicWrapKey.pem)
export ATTESTATION=$(<test/attestation-samples/snp.json)

# if $KEYS_DIR doesn't exist, create it and
# attempt to make contnts.
 if ! [ -d "$KEYS_DIR" ]; then
    mkdir -p $KEYS_DIR
    make get-service-cert
    if [ -n "$PUBLIC_CERT_PEM" ]; then
        echo -n "$PUBLIC_CERT_PEM" > $PUBLIC_CERT
    fi
    if [ -n "$PRIVATE_CERT_PEM" ]; then
        echo -n "$PRIVATE_CERT_PEM" > $PRIVATE_CERT
    fi
 fi
