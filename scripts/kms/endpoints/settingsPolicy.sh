#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

settingsPolicy() {
    auth="member_cert"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --auth)
                auth="$2"
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1"
                exit 1
                ;;
        esac
    done

    auth_arg=()
    if [[ "$auth" == "member_cert" ]]; then
        auth_arg=(--cert $KMS_MEMBER_CERT_PATH --key $KMS_MEMBER_PRIVK_PATH)
    fi

    curl $KMS_URL/app/settingsPolicy \
        --cacert $KMS_SERVICE_CERT_PATH \
        "${auth_arg[@]}" \
        -w '\n%{http_code}\n'
}

settingsPolicy "$@"