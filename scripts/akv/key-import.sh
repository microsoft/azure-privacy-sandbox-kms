#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

akv-key-import() {
    set -e

    AKV_NAME=${AKV_NAME:-$1}
    if [ -z "$AKV_NAME" ]; then
        read -p "Enter AKV name: " AKV_NAME
    fi
    export AKV_NAME

    AKV_KEY_NAME=${AKV_KEY_NAME:-$1}
    if [ -z "$AKV_KEY_NAME" ]; then
        read -p "Enter AKV Key name: " AKV_KEY_NAME
    fi
    export AKV_KEY_NAME

    az keyvault key import \
        --vault-name $AKV_NAME \
        --name $AKV_KEY_NAME \
        --pem-file $KMS_MEMBER_PRIVK_PATH

    set +e
}

akv-key-import "$@"

jq -n '{
    AKV_KEY_NAME: env.AKV_KEY_NAME,
}'
