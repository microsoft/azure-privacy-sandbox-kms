#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

az-cleanroom-aci-down() {
    set -e

    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
        export DEPLOYMENT_NAME
    fi
    export WORKSPACE=~/$DEPLOYMENT_NAME.ccfworkspace

    az cleanroom ccf network delete \
            --name ${DEPLOYMENT_NAME} \
            --provider-config $WORKSPACE/providerConfig.json \
            --delete-option delete-storage

    unset WORKSPACE
    unset DEPLOYMENT_NAME
    unset KMS_URL
    unset KMS_SERVICE_CERT_PATH
    unset KMS_MEMBER_CERT_PATH
    unset KMS_MEMBER_PRIVK_PATH

    set +e
}

az-cleanroom-aci-down
