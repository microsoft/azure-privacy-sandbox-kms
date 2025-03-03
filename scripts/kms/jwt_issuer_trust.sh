#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

decode_jwt() {

  # Extract the metadata field from the JWT and convert into non URL base64
  JWT_B64=$(echo "$JWT" \
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
  set -e

  envsubst < governance/proposals/set_ca_cert_bundle.json \
    | jq > $WORKSPACE/proposals/set_ca_cert_bundle.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_ca_cert_bundle.json

  set +e
}

set_jwt_issuer() {
  set -e

  envsubst < $REPO_ROOT/governance/proposals/set_jwt_issuer.json \
    | jq > $WORKSPACE/proposals/set_jwt_issuer.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_jwt_issuer.json

  set +e
}

set_jwt_validation_policy() {
  set -e

  envsubst < $REPO_ROOT/governance/proposals/set_jwt_validation_policy.json \
    | jq > $WORKSPACE/proposals/set_jwt_validation_policy.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_jwt_validation_policy.json

  set +e
}

use_demo_issuer() {
  set -e

  JWT=$(. $JWT_ISSUER_WORKSPACE/fetch.sh && jwt_issuer_fetch)
  DECODED_JWT=$(decode_jwt)

  # For set_jwt_issuer
  export JWKS=$(\
    npx pem-jwk "$JWT_ISSUER_WORKSPACE/private.pem" \
      | jq \
        --arg cert "$(cat "$JWT_ISSUER_WORKSPACE/cert.pem")" \
        '{keys: [({kty, n, e} + {x5c: [$cert]} + {kid: "Demo IDP kid"})]}' \
          | sed -e '1s/^/"jwks": /' -e '$s/$/,/' \
  )

  # For set_jwt_validation_policy
  export ISSUER=$(echo "$DECODED_JWT" | jq -r '.iss')
  export SUB=$(echo "$DECODED_JWT" | jq -r '.sub')
  export NAME=$(echo "$DECODED_JWT" | jq -r '.name')

  set +e
}

use_aad_issuer() {
  set -e

  JWT=$(. $JWT_ISSUER_WORKSPACE/fetch.sh && jwt_issuer_fetch)
  DECODED_JWT=$(decode_jwt)

  # For set_ca_cert_bundle
  export CA_CERT_BUNDLE_NAME="Microsoft_AAD"
  export CA_CERT_BUNDLE="$(awk '{printf "%s\\n", $0}' $REPO_ROOT/governance/jwt/aad_cert)"

  # For set_jwt_issuer
  export ISSUER=$(echo "$DECODED_JWT" | jq -r '.iss')
  export JWKS=$(\
    curl https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys \
      | jq \
          | sed -e '1s/^/"jwks": /' -e '$s/$/,/' \
  )
  export CA_CERT_BUNDLE_NAME_FIELD="\"ca_cert_bundle_name\": \"$CA_CERT_BUNDLE_NAME\","
  export AUTO_REFRESH="\"auto_refresh\": true,"

  # For set_jwt_validation_policy
  export SUB=$(echo "$DECODED_JWT" | jq -r '.sub')
  export NAME=$(echo "$DECODED_JWT" | jq -r '.name')

  set_ca_cert_bundle

  set +e
}

jwt-issuer-trust() {
  set -e

  issuer="demo"

  # Parse command-line arguments
  while [[ $# -gt 0 ]]; do
      case "$1" in
          --demo)
              issuer="demo"
              shift 1
              ;;
          --aad)
              issuer="aad"
              shift 1
              ;;
          *)
              echo "Unknown parameter: $1"
              exit 1
              ;;
      esac
  done

  if [[ "$issuer" == "demo" ]]; then
    use_demo_issuer
  elif [[ "$issuer" == "aad" ]]; then
    use_aad_issuer
  fi

  set_jwt_issuer
  set_jwt_validation_policy

  set +e
}

jwt-issuer-trust "$@"