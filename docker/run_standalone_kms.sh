#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

run_ccf() {

  /opt/ccf_${CCF_PLATFORM}/bin/sandbox.sh \
    --js-app-bundle ./dist/ \
    --initial-member-count 3 \
    --initial-user-count 1 \
    --constitution ./governance/constitution/actions/kms.js \
    --jwt-issuer workspace/proposals/set_jwt_issuer.json \
    -v --http2 "$@" &

  export WORKSPACE="$PWD/workspace"
  mkdir -p $WORKSPACE/proposals

  until [ -f $WORKSPACE/sandbox_0/0.rpc_addresses ]; do
      sleep 1
  done

  export KMS_URL="${KMS_URL:-https://$(jq -r '.primary_rpc_interface' $WORKSPACE/sandbox_0/0.rpc_addresses)}"

  until curl -s -k -f $KMS_URL/node/state > /dev/null 2>&1; do
      sleep 1
  done

  export KMS_SERVICE_CERT_PATH="$WORKSPACE/sandbox_common/service_cert.pem"
  export KMS_MEMBER_CERT_PATH="$WORKSPACE/sandbox_common/member0_cert.pem"
  export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/sandbox_common/member0_privk.pem"
}

mkdir -p workspace/proposals

(cd test/utils/jwt && KMS_WORKSPACE=/kms/workspace nohup npm run start > nohup.out 2>&1 &)
./scripts/wait_idp_ready.sh

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

run_ccf "$@"

make setup

tail -f /kms/workspace/sandbox_0/out