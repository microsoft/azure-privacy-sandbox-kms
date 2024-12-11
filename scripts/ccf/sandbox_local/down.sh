#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-sandbox-local-down() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"
    docker compose -f $REPO_ROOT/services/docker-compose.yml down ccf-sandbox --remove-orphans

    unset KMS_URL
    unset KMS_SERVICE_CERT_PATH
    unset KMS_MEMBER_CERT_PATH
    unset KMS_MEMBER_PRIVK_PATH
    unset KMS_USER_CERT_PATH
    unset KMS_USER_PRIVK_PATH

    set +e
}

ccf-sandbox-local-down
