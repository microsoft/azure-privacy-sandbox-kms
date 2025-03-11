#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

run_jwt_issuer() {
  (
      cd test/utils/jwt
      KMS_WORKSPACE=/kms/workspace npm run start 2>&1 &
  )

  export JWT_ISSUER_WORKSPACE=$WORKSPACE
  export JWT_ISSUER="http://localhost:3000/token"

  until curl -s -k -f -X POST $JWT_ISSUER > /dev/null 2>&1; do
      sleep 1
  done
}

mkdir -p workspace/proposals

run_jwt_issuer

JWK=$(npx pem-jwk "./workspace/private.pem" | \
      jq --arg cert "$(cat ./workspace/cert.pem)" '{kty, n, e} + {x5c: [$cert]} + {kid: "Demo IDP kid"}')

cat <<EOF | jq > ./workspace/proposals/set_jwt_issuer.json
{
  "issuer": "http://Demo-jwt-issuer",
  "jwks": {
    "keys": [
      $JWK
    ]
  }
}
EOF

env -i PATH=${PATH} KMS_WORKSPACE=workspace \
  /opt/ccf_${CCF_PLATFORM}/bin/sandbox.sh \
    --js-app-bundle ./dist/ \
    --initial-member-count 3 \
    --initial-user-count 1 \
    --constitution ./governance/constitution/actions/kms.js \
    --jwt-issuer workspace/proposals/set_jwt_issuer.json \
    -v --http2 "$@" &

./scripts/kms_wait.sh

make setup

tail -f /kms/workspace/sandbox_0/out