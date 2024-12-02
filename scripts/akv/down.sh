#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

akv-down() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

    source $REPO_ROOT/services/cacitesting.env
    AKV_NAME=${AKV_NAME:-$1}
    if [ -z "$AKV_NAME" ]; then
        read -p "Enter AKV name: " AKV_NAME
    fi

    az keyvault delete \
        --resource-group $RESOURCE_GROUP \
        --name $AKV_NAME

    unset AKV_NAME

    set +e
}

akv-down "$@"
