#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

export WORKSPACE=/kms/workspace
export JWT_ISSUER_WORKSPACE=/kms/workspace
export KMS_URL=${KMS_URL:-https://127.0.0.1:8000}
export KMS_SERVICE_CERT_PATH=./workspace/sandbox_common/service_cert.pem
export KMS_MEMBER_CERT_PATH=./workspace/sandbox_common/member0_cert.pem
export KMS_MEMBER_PRIVK_PATH=./workspace/sandbox_common/member0_privk.pem

mkdir -p $WORKSPACE/proposals

if ! az account show > /dev/null 2>&1; then
  echo "No Azure CLI login detected. Logging in as a managed identity..."
  az login --identity
fi

/opt/ccf_${CCF_PLATFORM}/bin/sandbox.sh \
  --initial-member-count 3 \
  --initial-user-count 1 \
  -v --http2 "$@" &

# Wait for the CCF network to start
until curl -k -f -s $KMS_URL/node/state && \
  test -f workspace/sandbox_common/user0_cert.pem; do
  sleep 1
done

source .venv_ccf_sandbox/bin/activate

./scripts/kms/js_app_set.sh

./scripts/kms/release_policy_set.sh governance/proposals/set_key_release_policy_add.json

./scripts/kms/jwt_issuer_trust.sh \
  --private-key-path "$JWT_ISSUER_WORKSPACE/private.pem" \
  --token "`
    curl -X POST "$(cat $JWT_ISSUER_WORKSPACE/jwt_issuer_address)/token" \
      | jq -r '.access_token' \
  `"

./scripts/kms/jwt_issuer_trust.sh --managed-identity "` \
  az identity show --query id -o tsv \
    --resource-group privacy-sandbox-dev \
    --name privacysandbox \
`"

./scripts/kms/endpoints/refresh.sh

sleep infinity
# tail -f /kms/workspace/sandbox_0/out