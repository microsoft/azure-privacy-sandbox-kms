#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

jwt-issuer-trust() {
  set -e

  REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

  # Check for new issuer
  while [[ $# -gt 0 ]]; do
      case "$1" in
          --iss)
              JWT_ISSUER="$2"
              shift 2
              ;;
          --iss=*)
              JWT_ISSUER="${1#*=}"
              shift 1
              ;;
          *)
              echo "Unknown parameter: $1"
              exit 1
              ;;
      esac
  done
  
  # Populate the JWK of the token issuer
  PRIVATE_PEM="$WORKSPACE/private.pem"
  CERT_PEM="$WORKSPACE/cert.pem"
  export JWK=$(npx pem-jwk "$PRIVATE_PEM" | jq --arg cert "$(cat "$CERT_PEM")" \
    '{kty, n, e} + {x5c: [$cert]} + {kid: "Demo IDP kid"}')
  envsubst < $REPO_ROOT/governance/proposals/set_jwt_issuer.json | jq > $WORKSPACE/proposals/set_jwt_issuer.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_jwt_issuer.json
}

jwt-issuer-trust "$@"