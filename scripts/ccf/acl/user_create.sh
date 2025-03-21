#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

cert-fingerprint() {
    openssl x509 -in "$1" -noout -fingerprint -sha256 | cut -d "=" -f 2
}

acl-user-local-cert-create() {
    openssl ecparam -out "$WORKSPACE/$1_privk.pem" -name "secp384r1" -genkey
    openssl req -new -key "$WORKSPACE/$1_privk.pem" -x509 -nodes -days 365 -out "$WORKSPACE/$1_cert.pem" -"sha384" -subj=/CN="ACL Client Cert"
}

acl-user-akv-cert-create() {
    az keyvault certificate create \
        --vault-name $AKV_VAULT_NAME \
        --name $1 \
        --policy "${AKV_POLICY:-$(cat $REPO_ROOT/scripts/akv/key_policy.json | jq -c .)}"
    rm -rf $WORKSPACE/$1_cert.pem
    az keyvault certificate download \
        --vault-name $AKV_VAULT_NAME \
        --name $1 \
        --file $WORKSPACE/$1_cert.pem
}

acl-user-create() {
    local member_id=$1
    local roles=$2

    curl $KMS_URL/app/ledgerUsers/$member_id?api-version=2024-08-22-preview \
        --cacert $KMS_SERVICE_CERT_PATH \
        -X PATCH \
        -H "Content-Type: application/merge-patch+json" \
        -H "Authorization: Bearer $(az account get-access-token --resource https://confidential-ledger.azure.com --query accessToken -o tsv)" \
        -d "$(jq -n --arg member_id "$member_id" --argjson roles "$roles" '{
            user_id: $member_id,
            assignedRoles: $roles
        }')"
}

