#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-sandbox-local-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

    export WORKSPACE="$(realpath ${WORKSPACE:-$REPO_ROOT/workspace})"
    mkdir -p $WORKSPACE
    cp $REPO_ROOT/scripts/ccf/sandbox_local/join_config.json $WORKSPACE
    docker compose -f $REPO_ROOT/services/docker-compose.yml build ccf-sandbox >&2
    docker compose -f $REPO_ROOT/services/docker-compose.yml up ccf-sandbox --wait "$@"
    sudo chown $USER:$USER -R $WORKSPACE
    mkdir -p $WORKSPACE/proposals

    export KMS_URL="https://127.0.0.1:8000"
    export KMS_SERVICE_CERT_PATH="$WORKSPACE/sandbox_common/service_cert.pem"
    export KMS_USER_CERT_PATH="$WORKSPACE/sandbox_common/user0_cert.pem"
    export KMS_USER_PRIVK_PATH="$WORKSPACE/sandbox_common/user0_privk.pem"
    export KMS_MEMBER_CERT_PATH="$WORKSPACE/sandbox_common/member0_cert.pem"
    export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/sandbox_common/member0_privk.pem"

    if [ ! -f "$KMS_USER_CERT_PATH" ]; then
        echo "Error: KMS user certificate not found at $KMS_USER_CERT_PATH"
        exit 1
    fi

    set +e
}

ccf-sandbox-local-up "$@"

jq -n '{
    WORKSPACE: env.WORKSPACE,
    KMS_URL: env.KMS_URL,
    KMS_SERVICE_CERT_PATH: env.KMS_SERVICE_CERT_PATH,
    KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
    KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH,
    KMS_USER_CERT_PATH: env.KMS_USER_CERT_PATH,
    KMS_USER_PRIVK_PATH: env.KMS_USER_PRIVK_PATH
}'
