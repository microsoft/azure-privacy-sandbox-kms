#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

jwt_issuer_fetch() {
    curl -X POST "$(cat /kms/workspace/jwt_issuer_address)/token" \
        | jq -r '.access_token'
}
export JWT_ISSUER_WORKSPACE=/kms/workspace

mkdir -p workspace/proposals
declare -f jwt_issuer_fetch > $JWT_ISSUER_WORKSPACE/fetch.sh

(cd test/utils/jwt && KMS_WORKSPACE=/kms/workspace nohup npm run start > nohup.out 2>&1 &)
./scripts/wait_idp_ready.sh

/opt/ccf_${CCF_PLATFORM}/bin/sandbox.sh \
  --initial-member-count 3 \
  --initial-user-count 1 \
  -v --http2 "$@" &

export WORKSPACE=/kms/workspace
export KMS_URL=${KMS_URL:-https://127.0.0.1:8000}
export KMS_SERVICE_CERT_PATH=./workspace/sandbox_common/service_cert.pem
export KMS_MEMBER_CERT_PATH=./workspace/sandbox_common/member0_cert.pem
export KMS_MEMBER_PRIVK_PATH=./workspace/sandbox_common/member0_privk.pem

# Wait for the CCF network to start
until test -f workspace/sandbox_0/0.rpc_addresses && \
  curl -k -f https://$(jq -r '.primary_rpc_interface' workspace/sandbox_0/0.rpc_addresses)/node/state && \
  test -f workspace/sandbox_common/user0_cert.pem; do
  sleep 1
done

source .venv_ccf_sandbox/bin/activate

sleep 20

. ./scripts/kms/js_app_set.sh && propose_set_js_app

./scripts/kms/release_policy_set.sh governance/proposals/set_key_release_policy_add.json

./scripts/kms/jwt_issuer_trust.sh

make propose-jwt-ms-validation-policy

./scripts/kms/endpoints/refresh.sh

# tail -f /kms/workspace/sandbox_0/out
sleep infinity