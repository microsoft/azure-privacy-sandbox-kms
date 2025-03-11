#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

mkdir -p workspace/proposals

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

./scripts/kms_wait.sh

make setup

tail -f /kms/workspace/sandbox_0/out