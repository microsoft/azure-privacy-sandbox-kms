#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

run_ccf() {
    /opt/ccf_${CCF_PLATFORM:-virtual}/bin/sandbox.sh \
        --http2 \
        --initial-member-count 3 \
        --initial-user-count 1 \
        --http2 -v &

    export WORKSPACE="$PWD/workspace"

    until [ -f $WORKSPACE/sandbox_0/0.rpc_addresses ]; do
        sleep 1
    done

    export KMS_URL="https://$(jq -r '.primary_rpc_interface' $WORKSPACE/sandbox_0/0.rpc_addresses)"

    until curl -s -k -f $KMS_URL/node/state > /dev/null 2>&1; do
        sleep 1
    done

    export KMS_SERVICE_CERT_PATH="$WORKSPACE/sandbox_common/service_cert.pem"
    export KMS_MEMBER_CERT_PATH="$WORKSPACE/sandbox_common/member0_cert.pem"
    export KMS_MEMBER_PRIVK_PATH="$WORKSPACE/sandbox_common/member0_privk.pem"

    tail -f /kms/workspace/sandbox_0/out &
}

run_jwt_issuer() {
    (
        cd test/utils/jwt
        KMS_WORKSPACE=$WORKSPACE npm run start 2>&1 &
    )

    export JWT_ISSUER_WORKSPACE=$WORKSPACE
    export JWT_ISSUER="http://localhost:3000/token"

    until curl -s -k -f -X POST $JWT_ISSUER > /dev/null 2>&1; do
        sleep 1
    done
}

run_ccf
run_jwt_issuer

./scripts/kms/js_app_set.sh

./scripts/kms/constitution_set.sh \
    --actions governance/constitution/actions/kms.js \
    --resolve governance/constitution/resolve/auto_accept.js

./scripts/kms/jwt_issuer_trust.sh

./scripts/kms/settings_policy_set.sh

./scripts/kms/release_policy_set.sh \
    governance/proposals/set_key_release_policy_add.json

./scripts/kms/key_rotation_policy_set.sh \
    governance/proposals/set_key_rotation_policy.json

./scripts/kms/endpoints/refresh.sh