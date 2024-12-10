#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

auth() {
    params=()
    auth="jwt"
    jwtprops=""

    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --auth)
                auth="$2"
                shift 2
                ;;
            --jwtprops)
                jwtprops="$2"
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1"
                exit 1
                ;;
        esac
    done
 
    # Extract iss from jwtprops if present
    if [[ "$jwtprops" == *"iss="* ]]; then
        export JWT_ISSUER=$(echo "$jwtprops" | grep -oP '(?<=iss=)[^&]*')
    fi

    auth_arg=()
    if [[ "$auth" == "member_cert" ]]; then
        auth_arg=(--cert $KMS_MEMBER_CERT_PATH --key $KMS_MEMBER_PRIVK_PATH)
    elif [[ "$auth" == "user_cert" ]]; then
        auth_arg=(--cert $KMS_USER_CERT_PATH --key $KMS_USER_PRIVK_PATH)
    elif [[ "$auth" == "jwt" ]]; then
        auth_arg=(-H "Authorization: Bearer $(curl -X POST $JWT_TOKEN_ISSUER_URL$jwtprops | jq -r '.access_token')")
    fi

    curl $KMS_URL/app/auth \
        --cacert $KMS_SERVICE_CERT_PATH \
        "${auth_arg[@]}" \
        -H "Content-Type: application/json" \
        -w '\n%{http_code}\n'
}

auth "$@"