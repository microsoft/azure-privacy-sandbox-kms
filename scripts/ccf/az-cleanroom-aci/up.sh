#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

THIS_DIR="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
REPO_ROOT="$(realpath "$THIS_DIR/../../..")"

az-cleanroom-aci-up() {
    set -e

    source $REPO_ROOT/services/cacitesting.env
    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    az cleanroom ccf network up \
        --subscription $SUBSCRIPTION \
        --resource-group $RESOURCE_GROUP \
        --name $DEPLOYMENT_NAME

    export WORKSPACE=~/$DEPLOYMENT_NAME.ccfworkspace
    export KMS_URL=$( \
        az cleanroom ccf network show \
            --name ${DEPLOYMENT_NAME} \
            --provider-config $WORKSPACE/providerConfig.json \
            | jq -r '.endpoint' \
    )

    export KMS_SERVICE_CERT_PATH="$WORKSPACE/service_cert.pem"
    export KMS_MEMBER_CERT_PATH="$WORKSPACE/ccf-operator_cert.pem"
    export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/ccf-operator_privk.pem"

    sudo cp $KMS_SERVICE_CERT_PATH /usr/local/share/ca-certificates/kms_ca.crt
    sudo update-ca-certificates

    set +e
}

source $THIS_DIR/setup.sh
az-cleanroom-aci-setup
az-cleanroom-aci-up "$@"

jq -n '{
    WORKSPACE: env.WORKSPACE,
    KMS_URL: env.KMS_URL,
    KMS_SERVICE_CERT_PATH: env.KMS_SERVICE_CERT_PATH,
    KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
    KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH
}'
