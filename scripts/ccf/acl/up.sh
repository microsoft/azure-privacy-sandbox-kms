#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

acl-up() {

    source $REPO_ROOT/services/cacitesting.env
    source $REPO_ROOT/scripts/ccf/acl/user_create.sh

    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-$1}
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
    fi
    export DEPLOYMENT_NAME

    # Create a workspace for certs
    export WORKSPACE=~/$DEPLOYMENT_NAME.aclworkspace
    mkdir -p $WORKSPACE/proposals

    # Deploy the confidential ledger
    # (Must be in Australia East for now to get custom endpoint support)
    az confidentialledger create \
        --name $DEPLOYMENT_NAME \
        --subscription $SUBSCRIPTION \
        --resource-group $RESOURCE_GROUP \
        --location "AustraliaEast" \
        --ledger-type "Public"
    export KMS_URL="https://$DEPLOYMENT_NAME.confidential-ledger.azure.com"

    # Save the service certificate
    curl https://identity.confidential-ledger.core.azure.com/ledgerIdentity/$DEPLOYMENT_NAME \
        | jq -r '.ledgerTlsCertificate' > $WORKSPACE/service_cert.pem
    export KMS_SERVICE_CERT_PATH="$WORKSPACE/service_cert.pem"

    acl-user-create \
        $(az account show | jq -r '.id') '["Administrator"]'

    # Create a member cert
    export KMS_MEMBER_CERT_PATH="$WORKSPACE/member0_cert.pem"
    export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/member0_privk.pem"
    acl-user-local-cert-create member0
    acl-user-create \
        $(cert-fingerprint $KMS_MEMBER_CERT_PATH) '["Administrator"]'

    # Create a user cert
    export KMS_USER_CERT_PATH="$WORKSPACE/user0_cert.pem"
    export KMS_USER_PRIVK_PATH="$WORKSPACE/user0_privk.pem"
    acl-user-local-cert-create user0
    acl-user-create \
        $(cert-fingerprint $KMS_USER_CERT_PATH) '["Reader"]'

}

acl-up "$@"

jq -n '{
    DEPLOYMENT_NAME: env.DEPLOYMENT_NAME,
    WORKSPACE: env.WORKSPACE,
    KMS_URL: env.KMS_URL,
    KMS_SERVICE_CERT_PATH: env.KMS_SERVICE_CERT_PATH,
    KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
    KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH,
    KMS_USER_CERT_PATH: env.KMS_USER_CERT_PATH,
    KMS_USER_PRIVK_PATH: env.KMS_USER_PRIVK_PATH
}'