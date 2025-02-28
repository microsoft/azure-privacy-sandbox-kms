#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

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

  export ISSUER="http://Demo-jwt-issuer"
  export JWKS=$(\
    npx pem-jwk "$JWT_ISSUER_WORKSPACE/private.pem" \
      | jq \
        --arg cert "$(cat "$JWT_ISSUER_WORKSPACE/cert.pem")" \
        '{keys: [({kty, n, e} + {x5c: [$cert]} + {kid: "Demo IDP kid"})]}' \
          | sed -e '1s/^/"jwks": /' -e '$s/$/,/' \
  )

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
              shift 2
              ;;
          *)
              echo "Unknown parameter: $1"
              exit 1
              ;;
      esac
  done

  if [[ "$issuer" == "demo" ]]; then
    use_demo_issuer
  fi

  set_jwt_issuer
  set_jwt_validation_policy

  set +e
}

jwt-issuer-trust "$@"