#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

acl-down() {

    source $REPO_ROOT/services/cacitesting.env

    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
    fi
    export DEPLOYMENT_NAME

    az confidentialledger delete -y --no-wait \
        --name $DEPLOYMENT_NAME \
        --subscription $SUBSCRIPTION \
        --resource-group $RESOURCE_GROUP

    unset DEPLOYMENT_NAME
    unset WORKSPACE
    unset KMS_URL
    unset KMS_SERVICE_CERT_PATH
    unset KMS_MEMBER_CERT_PATH
    unset KMS_MEMBER_PRIVK_PATH
}

acl-down "$@"