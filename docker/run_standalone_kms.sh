#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

jwt_issuer_fetch() {
    curl -X POST "$(cat ${JWT_ISSUER_WORKSPACE:-$REPO_ROOT/jwt_issuers_workspace/${UNIQUE_ID:-default}/}/jwt_issuer_address)/token" \
        | jq -r '.access_token'
}

mkdir -p workspace/proposals
export WORKSPACE=/kms/workspace

(cd test/utils/jwt && KMS_WORKSPACE=/kms/workspace nohup npm run start > nohup.out 2>&1 &)
./scripts/wait_idp_ready.sh

export JWT_ISSUER_WORKSPACE=/kms/workspace
declare -f jwt_issuer_fetch > $JWT_ISSUER_WORKSPACE/fetch.sh
sudo chown $USER:$USER -R $JWT_ISSUER_WORKSPACE
sudo chmod +x -R $JWT_ISSUER_WORKSPACE

/opt/ccf_${CCF_PLATFORM}/bin/sandbox.sh \
  --js-app-bundle ./dist/ \
  --initial-member-count 3 \
  --initial-user-count 1 \
  -v --http2 "$@" &

export KMS_URL=https://127.0.0.1:8000
export KMS_SERVICE_CERT_PATH=./workspace/sandbox_common/service_cert.pem
export KMS_MEMBER_CERT_PATH=./workspace/sandbox_common/member0_cert.pem
export KMS_MEMBER_PRIVK_PATH=./workspace/sandbox_common/member0_privk.pem

./scripts/kms_wait.sh

source .venv_ccf_sandbox/bin/activate
./scripts/kms/jwt_issuer_trust.sh

make setup

tail -f /kms/workspace/sandbox_0/out