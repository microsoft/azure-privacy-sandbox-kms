#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-id() {
    MEMBER_NAME=${1:-$MEMBER_NAME}
    if [ -z "$MEMBER_NAME" ]; then
        read -p "Enter member name: " MEMBER_NAME
    fi
    export MEMBER_NAME

    openssl x509 \
        -in "${WORKSPACE}/${MEMBER_NAME}_cert.pem" \
        -noout -fingerprint -sha256 \
        | cut -d "=" -f 2 \
        | sed 's/://g' \
        | awk '{print tolower($0)}'
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-id "$@"
fi
