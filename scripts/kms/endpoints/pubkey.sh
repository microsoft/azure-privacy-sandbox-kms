#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

pubkey() {
    params=()

    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --kid)
                params+=("kid=$2")
                shift 2
                ;;
            --fmt)
                params+=("fmt=$2")
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1"
                exit 1
                ;;
        esac
    done

    # Construct query string
    query_string=""
    if [[ ${#params[@]} -gt 0 ]]; then
        query_string="?"$(IFS='&'; echo "${params[*]}")
    fi

    curl $KMS_URL/app/pubkey${query_string} \
        --cacert $KMS_SERVICE_CERT_PATH \
        --cert $KMS_MEMBER_CERT_PATH \
        --key $KMS_MEMBER_PRIVK_PATH \
        -w '\n%{http_code}\n'
}

pubkey "$@"