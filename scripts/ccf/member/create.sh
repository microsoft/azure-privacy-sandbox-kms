#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"
USE_AKV=${USE_AKV:-false}

ccf-member-create-local() {
    openssl ecparam -out "$WORKSPACE/$1_privk.pem" -name "secp384r1" -genkey
    openssl req -new -key "$WORKSPACE/$1_privk.pem" -x509 -nodes -days 365 -out "$WORKSPACE/$1_cert.pem" -"sha384" -subj=/CN="KMS Client Cert"
}

ccf-member-create-akv() {
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

ccf-member-create() {
    if [[ $USE_AKV == false ]]; then
        ccf-member-create-local $1
    else
        ccf-member-create-akv $1
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-create "$@"
fi