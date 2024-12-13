#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

jwt-issuer-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    export JWT_ISSUER_WORKSPACE=$(realpath ${JWT_ISSUER_WORKSPACE:-$REPO_ROOT/jwt_issuer_workspace})
    mkdir -p $JWT_ISSUER_WORKSPACE

    docker compose -f services/docker-compose.yml up jwt-issuer --wait

    sudo chown $USER:$USER -R $JWT_ISSUER_WORKSPACE


    set +e
}

jwt-issuer-up

jq -n '{
    JWT_ISSUER_WORKSPACE: env.JWT_ISSUER_WORKSPACE,
}'