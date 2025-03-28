#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

decode_jwt() {

  # Extract the metadata field from the JWT and convert into non URL base64
  JWT_B64=$(echo "$1" \
    | cut -d '.' -f2 \
    | sed 's/-/+/g; s/_/\//g;')

  # Add padding if necessary
  MOD4=$(( ${#JWT_B64} % 4 ))
  if [ $MOD4 -eq 2 ]; then
    JWT_B64="${JWT_B64}=="
  elif [ $MOD4 -eq 3 ]; then
    JWT_B64="${JWT_B64}="
  fi

  # Decode the JWT
  echo "$JWT_B64" | base64 --decode

}

set_ca_cert_bundle() {

  envsubst < governance/proposals/set_ca_cert_bundle.json \
    | jq > $WORKSPACE/proposals/set_ca_cert_bundle.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_ca_cert_bundle.json
}

set_jwt_issuer() {

  envsubst < $REPO_ROOT/governance/proposals/set_jwt_issuer.json \
    | jq > $WORKSPACE/proposals/set_jwt_issuer.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_jwt_issuer.json
}

set_jwt_validation_policy() {

  envsubst < $REPO_ROOT/governance/proposals/set_jwt_validation_policy.json \
    | jq > $WORKSPACE/proposals/set_jwt_validation_policy.json

  # Submit the proposal
  $REPO_ROOT/scripts/kms/endpoints/proposals.sh \
    $WORKSPACE/proposals/set_jwt_validation_policy.json
}

jwt-issuer-get-jwks-from-file() {
    npx pem-jwk "$1" \
    | jq \
        --arg cert "$( \
            openssl req -new -x509 \
                -key "$1" \
                -days 365 -subj "/CN=Demo IDP" \
            | sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' \
            | sed '1d;$d' | tr -d '\n' \
        )" \
        '{keys: [({kty, n, e}
        + {x5c: [$cert]}
        + (if .kid then {kid: .kid} else {kid: "Demo IDP kid"} end))]}' \
    | sed -e '1s/^/"jwks": /' -e '$s/$/,/'
}

jwt-issuer-get-jwks-from-json() {
    echo $1 \
        | jq '{keys: [.keys[] | {kty, kid, n, e, x5c}]}' \
        | sed -e '1s/^/"jwks": /' -e '$s/$/,/'
}

jwt-issuer-get-policy-from-token() {
    decode_jwt "$1" | jq -r '{
            iss,
            sub,
            name,
            idtyp,
            oid
        } | with_entries(select(.value != null))'
}

jwt-issuer-get-policy-from-mi() {
    az identity show --ids $1 | jq '{
        iss: "https://login.microsoftonline.com/\( .tenantId )/v2.0",
        sub: .principalId,
        name: .name,
        idtyp: "app",
        oid: .principalId
    }'
}

jwt-issuer-get-policy-from-current-user() {
    jwt-issuer-get-policy-from-token ` \
        az account get-access-token \
            --resource https://confidential-ledger.azure.com \
            | jq -r '.accessToken' \
    `
}

jwt-issuer-trust() {

    source $REPO_ROOT/scripts/ccf/member/add.sh

    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --private-key-path)
                JWKS=`jwt-issuer-get-jwks $(cat $2)`
                shift 2
                ;;
            --private-key-json)
                JWKS=`jwt-issuer-get-jwks-from-json $2`
                shift 2
                ;;
            --token)
                JWT_CLAIMS=`jwt-issuer-get-policy-from-token $2`
                shift 2
                ;;
            --demo)
                JWKS=`jwt-issuer-get-jwks-from-file $JWT_ISSUER_WORKSPACE/private.pem`
                JWT_CLAIMS=`jwt-issuer-get-policy-from-token $(. $JWT_ISSUER_WORKSPACE/fetch.sh && jwt_issuer_fetch)`
                shift 1
                ;;
            --managed-identity)
                CA_CERT_BUNDLE_NAME="Microsoft_AAD"
                CA_CERT_BUNDLE="$(awk '{printf "%s\\n", $0}' $REPO_ROOT/governance/jwt/aad_cert)"
                CA_CERT_BUNDLE_NAME_FIELD="\"ca_cert_bundle_name\": \"$CA_CERT_BUNDLE_NAME\","
                JWKS=`jwt-issuer-get-jwks-from-json \
                    $(curl https://login.microsoftonline.com/$(az identity show --ids $2 | jq -r ".tenantId")/discovery/v2.0/keys)`
                JWT_CLAIMS=`jwt-issuer-get-policy-from-mi $2`
                shift 2
                ;;
            --current-user|--aad)
                CA_CERT_BUNDLE_NAME="Microsoft_AAD"
                CA_CERT_BUNDLE="$(awk '{printf "%s\\n", $0}' $REPO_ROOT/governance/jwt/aad_cert)"
                CA_CERT_BUNDLE_NAME_FIELD="\"ca_cert_bundle_name\": \"$CA_CERT_BUNDLE_NAME\","
                JWKS=`jwt-issuer-get-jwks-from-json \
                    $(curl https://login.microsoftonline.com/$(az account show | jq -r ".tenantId")/discovery/v2.0/keys)`
                JWT_CLAIMS=`jwt-issuer-get-policy-from-current-user`
                shift 1
                ;;
            *)
                echo "Unknown parameter: $1"
                exit 1
                ;;
        esac
    done

    export CA_CERT_BUNDLE
    export CA_CERT_BUNDLE_NAME
    export CA_CERT_BUNDLE_NAME_FIELD
    export JWKS
    export JWT_VALIDATION_POLICY="\"validation_policy\": ${JWT_CLAIMS}"
    export ISSUER=$(echo $JWT_CLAIMS | jq -r '.iss')

    if [[ "$KMS_URL" == *"confidential-ledger.azure.com" ]]; then
        ccf-member-add `az identity show --ids $2` '["Reader"]'
    else
        if [[ -n "$CA_CERT_BUNDLE_NAME" ]]; then
            set_ca_cert_bundle
        fi
        set_jwt_issuer
    fi

    set_jwt_validation_policy

    set +e
}

jwt-issuer-trust "$@"