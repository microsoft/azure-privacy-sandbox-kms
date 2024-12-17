#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

jwt-issuer-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    export JWT_ISSUER_WORKSPACE=$(realpath ${JWT_ISSUER_WORKSPACE:-$REPO_ROOT/jwt_issuer_workspace})
    mkdir -p $JWT_ISSUER_WORKSPACE
    export JWT_TOKEN_ISSUER_URL="http://localhost:3000/token"
    export JWT_ISSUER="http://Demo-jwt-issuer"

    docker compose -f services/docker-compose.yml up jwt-issuer --wait
    sudo chown $USER:$USER -R $JWT_ISSUER_WORKSPACE

    export JWT_TOKEN_ISSUER_URL="http://localhost:3000/token"
    export JWT_ISSUER="http://Demo-jwt-issuer"

    set +e
}

jwt-issuer-up

jq -n '{
    JWT_ISSUER_WORKSPACE: env.JWT_ISSUER_WORKSPACE,
    JWT_TOKEN_ISSUER_URL: env.JWT_TOKEN_ISSUER_URL,
    JWT_ISSUER: env.JWT_ISSUER,

}'