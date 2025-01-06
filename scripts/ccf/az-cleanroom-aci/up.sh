#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

THIS_DIR="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
REPO_ROOT="$(realpath "$THIS_DIR/../../..")"

az-cleanroom-aci-get-url() {
    az cleanroom ccf network show \
        --name ${DEPLOYMENT_NAME} \
        --provider-client "$DEPLOYMENT_NAME-provider" \
        --provider-config $WORKSPACE/providerConfig.json \
        | jq -r '.endpoint'
}

az-cleanroom-aci-up() {
    set -e

    source $REPO_ROOT/services/cacitesting.env
    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
    fi
    export DEPLOYMENT_NAME
    export WORKSPACE=~/$DEPLOYMENT_NAME.ccfworkspace

    retries=10
    ccf_up=false
    success=false
    set +e
    while [ $ccf_up = false ] && [ $success = false ] && [ $retries -gt 0 ]; do
        az cleanroom ccf network up \
            --subscription $SUBSCRIPTION \
            --resource-group $RESOURCE_GROUP \
            --provider-client "$DEPLOYMENT_NAME-provider" \
            --name $DEPLOYMENT_NAME
        if [ $? -eq 0 ]; then
            success=true
        fi
        kms_url=`az-cleanroom-aci-get-url`
        if curl -k $kms_url/node/network -o /dev/null -s -w "%{http_code}" | grep -q 200; then
            ccf_up=true
        fi
        retries=$((retries - 1))
    done
    set -e

    if [ $success = false ] || [ $ccf_up = false ]; then
        exit 1
    fi

    export KMS_URL=`az-cleanroom-aci-get-url`

    export KMS_SERVICE_CERT_PATH="$WORKSPACE/service_cert.pem"
    export KMS_MEMBER_CERT_PATH="$WORKSPACE/ccf-operator_cert.pem"
    export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/ccf-operator_privk.pem"

    mkdir -p $WORKSPACE/proposals

    set +e
}

source $THIS_DIR/setup.sh
az-cleanroom-aci-setup
az-cleanroom-aci-up "$@"

jq -n '{
    DEPLOYMENT_NAME: env.DEPLOYMENT_NAME,
    WORKSPACE: env.WORKSPACE,
    KMS_URL: env.KMS_URL,
    KMS_SERVICE_CERT_PATH: env.KMS_SERVICE_CERT_PATH,
    KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
    KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH
}'
