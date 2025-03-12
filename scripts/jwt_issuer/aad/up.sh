#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

THIS_DIR="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
REPO_ROOT="$(realpath "$THIS_DIR/../..")"

jwt_issuer_fetch() {
    az account get-access-token --resource https://confidential-ledger.azure.com \
        | jq -r '.accessToken'
}

jwt-issuer-up() {
    set -e

    if ! az account show > /dev/null 2>&1; then
        echo "Not logged in to Azure CLI. Logging in..."
        az login
    fi

    export JWT_ISSUER_WORKSPACE=${JWT_ISSUER_WORKSPACE:-$REPO_ROOT/jwt_issuers_workspace/${UNIQUE_ID:-default}/}

    mkdir -p $JWT_ISSUER_WORKSPACE
    sudo chown $USER:$USER -R $JWT_ISSUER_WORKSPACE
    declare -f jwt_issuer_fetch > $JWT_ISSUER_WORKSPACE/fetch.sh

    set +e
}

jwt-issuer-up "$@"

jq -n '{
    JWT_ISSUER_WORKSPACE: env.JWT_ISSUER_WORKSPACE,
}'