#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

key() {
    params=()
    auth="member_cert"
    attestation=""
    wrappingKey=""

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
            --attestation)
                attestation="$2"
                shift 2
                ;;
            --wrapping-key)
                wrappingKey="$2"
                shift 2
                ;;
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

    # Construct query string
    query_string=""
    if [[ ${#params[@]} -gt 0 ]]; then
        query_string="?"$(IFS='&'; echo "${params[*]}")
    fi

    auth_arg=()
    if [[ "$auth" == "member_cert" ]]; then
        auth_arg=(--cert $KMS_MEMBER_CERT_PATH --key $KMS_MEMBER_PRIVK_PATH)
    elif [[ "$auth" == "jwt" ]]; then
        auth_arg=(-H "Authorization: Bearer $(curl -X POST $JWT_ISSUER | jq -r '.access_token')")
    fi

    curl $KMS_URL/app/key${query_string} \
        -X POST \
        --cacert $KMS_SERVICE_CERT_PATH \
        "${auth_arg[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"attestation\":$attestation, \"wrappingKey\":$wrappingKey}" \
        -w '\n%{http_code}\n'
}

key "$@"