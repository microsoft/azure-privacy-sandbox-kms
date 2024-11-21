#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-sandbox-local-up() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

    docker compose -f $REPO_ROOT/services/docker-compose.yml up ccf-sandbox --wait

    export WORKSPACE="$(realpath ${WORKSPACE:-./workspace})"
    export KMS_URL="https://127.0.0.1:8000"
    export KMS_SERVICE_CERT_PATH="$WORKSPACE/sandbox_common/service_cert.pem"
    export KMS_MEMBER_CERT_PATH="$WORKSPACE/sandbox_common/member0_cert.pem"
    export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/sandbox_common/member0_privk.pem"

    set +e
}

ccf-sandbox-local-up

jq -n '{
    WORKSPACE: env.WORKSPACE,
    KMS_URL: env.KMS_URL,
    KMS_SERVICE_CERT_PATH: env.KMS_SERVICE_CERT_PATH,
    KMS_MEMBER_CERT_PATH: env.KMS_MEMBER_CERT_PATH,
    KMS_MEMBER_PRIVK_PATH: env.KMS_MEMBER_PRIVK_PATH
}'
