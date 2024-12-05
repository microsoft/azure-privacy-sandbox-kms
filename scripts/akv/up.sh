#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

akv-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

    source $REPO_ROOT/services/cacitesting.env
    AKV_VAULT_NAME=${AKV_VAULT_NAME:-$1}
    if [ -z "$AKV_VAULT_NAME" ]; then
        read -p "Enter AKV name: " AKV_VAULT_NAME
    fi
    export AKV_VAULT_NAME

    if ! az keyvault show --name $AKV_VAULT_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
        az keyvault create \
            --resource-group $RESOURCE_GROUP \
            --name $AKV_VAULT_NAME
    fi

    export AKV_URL=$(az keyvault show --name $AKV_VAULT_NAME --query properties.vaultUri -o tsv)

    set +e
}

akv-up "$@"

jq -n '{
    AKV_VAULT_NAME: env.AKV_VAULT_NAME,
    AKV_URL: env.AKV_URL,
}'
