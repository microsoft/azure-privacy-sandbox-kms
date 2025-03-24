#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

release-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh
    RELEASE_POLICY_PROPOSAL=$1

    # Construct the proposal
    cp $REPO_ROOT/$RELEASE_POLICY_PROPOSAL $WORKSPACE/proposals/set_key_release_policy.json

    # Submit the proposal
    if [[ "$KMS_URL" == *"confidential-ledger.azure.com" ]]; then
        AKV_KEY_NAME="user0" ccf-sign \
            "$WORKSPACE/proposals/set_key_release_policy.json" \
                | $REPO_ROOT/scripts/kms/endpoints/proposals.sh
    else
        $REPO_ROOT/scripts/kms/endpoints/proposals.sh \
            $WORKSPACE/proposals/set_key_release_policy.json
    fi

    set +e
}

release-policy-set "$@"
