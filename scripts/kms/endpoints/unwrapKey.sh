#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

unwrap_key() {
    params=()
    auth="jwt"
    attestation=""
    wrappedKid=""
    wrappingKey=""

    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --attestation)
                attestation="$2"
                shift 2
                ;;
            --wrappedKid)
                wrappedKid="$2"
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

    auth_arg=()
    if [[ "$auth" == "member_cert" ]]; then
        auth_arg=(--cert $KMS_MEMBER_CERT_PATH --key $KMS_MEMBER_PRIVK_PATH)
    elif [[ "$auth" == "user_cert" ]]; then
        auth_arg=(--cert $KMS_USER_CERT_PATH --key $KMS_USER_PRIVK_PATH)
    elif [[ "$auth" == "jwt" ]]; then
        auth_arg=(-H "Authorization: Bearer $(. $JWT_ISSUER_WORKSPACE/fetch.sh && jwt_issuer_fetch)")
    fi

    curl $KMS_URL/app/unwrapKey \
        -X POST \
        --cacert $KMS_SERVICE_CERT_PATH \
        "${auth_arg[@]}" \
        -H "Content-Type: application/json" \
        -d '{
            "attestation": '"$attestation"',
            "wrappedKid": "'"$wrappedKid"'",
            "wrapped": "",
            "wrappingKey": "'"$wrappingKey"'\n"
        }' \
        -w '\n%{http_code}\n'
}

unwrap_key "$@"