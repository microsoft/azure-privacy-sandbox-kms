#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"

# Populate the JWK of the token issuer
PRIVATE_PEM="$WORKSPACE/private.pem"
CERT_PEM="$WORKSPACE/cert.pem"
export JWK=$(npx pem-jwk "$PRIVATE_PEM" | jq --arg cert "$(cat "$CERT_PEM")" \
  '{kty, n, e} + {x5c: [$cert]} + {kid: "Demo IDP kid"}')
envsubst < $REPO_ROOT/governance/proposals/set_jwt_issuer.json | jq > $WORKSPACE/proposals/set_jwt_issuer.json

# Submit the proposal
source $REPO_ROOT/scripts/tools/ccf-propose.sh
ccf_propose $WORKSPACE/proposals/set_jwt_issuer.json