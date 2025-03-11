#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

mkdir -p workspace
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

./scripts/set_python_env.sh

npm install
npm run build

env -i PATH=${PATH} KMS_WORKSPACE=workspace \
  /opt/ccf_${CCF_PLATFORM}/bin/sandbox.sh \
    --js-app-bundle ./dist/ \
    --initial-member-count 3 \
    --initial-user-count 1 \
    --constitution ./governance/constitution/actions/kms.js \
    --jwt-issuer workspace/proposals/set_jwt_issuer.json \
    -v --http2 "$@" &
export KMS_URL=${KMS_URL:-https://127.0.0.1:8000}
export KMS_SERVICE_CERT_PATH=${KMS_SERVICE_CERT_PATH:-./workspace/sandbox_common/service_cert.pem}

./scripts/kms_wait.sh

./scripts/kms/release_policy_set.sh \
  governance/proposals/set_key_release_policy_add.json

./scripts/kms/key_rotation_policy_set.sh \
  governance/proposals/set_key_rotation_policy.json

./scripts/jwt_issuer/aad/up.sh && ./scripts/kms/jwt_issuer_trust.sh

./scripts/kms/endpoints/refresh.sh

tail -f /kms/workspace/sandbox_0/out