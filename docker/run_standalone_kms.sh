#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

mkdir -p $WORKSPACE/proposals
cp /kms/workspace/sandbox_common/*.pem /kms/workspace/ || true

if ! az account show > /dev/null 2>&1; then
  echo "No Azure CLI login detected. Logging in as a managed identity..."
  az login --identity
fi


./scripts/kms/js_app_set.sh

./scripts/kms/release_policy_set.sh governance/proposals/set_key_release_policy_add.json

./scripts/kms/jwt_issuer_trust.sh \
  --private-key-path "$JWT_ISSUER_WORKSPACE/private.pem" \
  --token "`
    curl -X POST "$(cat $JWT_ISSUER_WORKSPACE/jwt_issuer_address)/token" \
      | jq -r '.access_token' \
  `"

./scripts/kms/jwt_issuer_trust.sh --managed-identity-v1 "` \
  az identity show --query id -o tsv \
    --resource-group privacy-sandbox-dev \
    --name privacysandbox \
`"

./scripts/kms/endpoints/refresh.sh