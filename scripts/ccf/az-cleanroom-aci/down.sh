#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

THIS_DIR="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
REPO_ROOT="$(realpath "$THIS_DIR/../../..")"

az-cleanroom-aci-down() {
    set -e

    source $REPO_ROOT/services/cacitesting.env
    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
        export DEPLOYMENT_NAME
    fi
    export WORKSPACE=~/$DEPLOYMENT_NAME.ccfworkspace

    az cleanroom ccf network delete \
        --name ${DEPLOYMENT_NAME} \
        --provider-client "$DEPLOYMENT_NAME-provider" \
        --provider-config $WORKSPACE/providerConfig.json \
        --delete-option delete-storage || true

    az storage account delete --yes \
        --name "ccf$(cat $WORKSPACE/unique_string.txt)sa" \
        --resource-group $RESOURCE_GROUP

    rm -rf $WORKSPACE

    docker compose -p ${DEPLOYMENT_NAME}-operator-governance down || true
    docker compose -p ${DEPLOYMENT_NAME}-provider down || true

    unset WORKSPACE
    unset DEPLOYMENT_NAME
    unset KMS_URL
    unset KMS_SERVICE_CERT_PATH
    unset KMS_MEMBER_CERT_PATH
    unset KMS_MEMBER_PRIVK_PATH

    set +e
}

az-cleanroom-aci-down "$@"
