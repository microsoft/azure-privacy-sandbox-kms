#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

akv-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

    source $REPO_ROOT/services/cacitesting.env
    AKV_NAME=${AKV_NAME:-$1}
    if [ -z "$AKV_NAME" ]; then
        read -p "Enter AKV name: " AKV_NAME
    fi
    export AKV_NAME

    if ! az keyvault show --name $AKV_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
        az keyvault create \
            --resource-group $RESOURCE_GROUP \
            --name $AKV_NAME
    fi

    export AKV_URL=$(az keyvault show --name $AKV_NAME --query properties.vaultUri -o tsv)

    set +e
}

akv-up "$@"

jq -n '{
    AKV_NAME: env.AKV_NAME,
    AKV_URL: env.AKV_URL,
}'
