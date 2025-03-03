#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

acl-up() {

    source $REPO_ROOT/services/cacitesting.env

    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
    fi
    export DEPLOYMENT_NAME

    # Deploy the confidential ledger
    # (Must be in Australia East for now to get custom endpoint support)
    az confidentialledger create \
        --name $DEPLOYMENT_NAME \
        --subscription $SUBSCRIPTION \
        --resource-group $RESOURCE_GROUP \
        --location "AustraliaEast" \
        --ledger-type "Public" \
        --aad-based-security-principals ledger-role-name="Administrator" principal-id="$(az account show | jq -r '.id')"
    export KMS_URL="https://$DEPLOYMENT_NAME.confidential-ledger.azure.com"

    export WORKSPACE=~/$DEPLOYMENT_NAME.aclworkspace
    mkdir -p $WORKSPACE
    mkdir -p $WORKSPACE/proposals

    # Save the service certificate
    curl https://identity.confidential-ledger.core.azure.com/ledgerIdentity/$DEPLOYMENT_NAME \
        | jq -r '.ledgerTlsCertificate' > $WORKSPACE/service_cert.pem
    export KMS_SERVICE_CERT_PATH="$WORKSPACE/service_cert.pem"

    # For ACL we don't have members
    export KMS_MEMBER_CERT_PATH=""
    export KMS_MEMBER_PRIVK_PATH=""
}

acl-up "$@"

jq -n '{
    DEPLOYMENT_NAME: env.DEPLOYMENT_NAME,
    WORKSPACE: env.WORKSPACE,
    KMS_URL: env.KMS_URL,
    KMS_SERVICE_CERT_PATH: env.KMS_SERVICE_CERT_PATH,
    KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
    KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH
}'