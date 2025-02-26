#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

jwt-issuer-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    export JWT_ISSUER_WORKSPACE=${JWT_ISSUER_WORKSPACE:-$REPO_ROOT/jwt_issuers_workspace/${UNIQUE_ID:-default}/}
    mkdir -p $JWT_ISSUER_WORKSPACE
    export JWT_TOKEN_ISSUER_URL="http://localhost:3000/token"
    export JWT_ISSUER="http://Demo-jwt-issuer"

    docker compose -p ${UNIQUE_ID:-default} -f services/docker-compose.yml up jwt-issuer --wait "$@"
    sudo chown $USER:$USER -R $JWT_ISSUER_WORKSPACE

    export JWT_TOKEN_ISSUER_URL="$(cat $JWT_ISSUER_WORKSPACE/jwt_issuer_address)/token"

    set +e
}

jwt-issuer-up "$@"

jq -n '{
    JWT_ISSUER_WORKSPACE: env.JWT_ISSUER_WORKSPACE,
    JWT_TOKEN_ISSUER_URL: env.JWT_TOKEN_ISSUER_URL,
    JWT_ISSUER: env.JWT_ISSUER,

}'