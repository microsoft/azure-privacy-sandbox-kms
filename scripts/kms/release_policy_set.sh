#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

release-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    USE_AKV=${USE_AKV:-false}
    RELEASE_POLICY_PROPOSAL=$1

    # Construct the proposal
    cp $REPO_ROOT/$RELEASE_POLICY_PROPOSAL $WORKSPACE/proposals/set_key_release_policy.json

    # Submit the proposal
    if [[ $USE_AKV == false ]]; then
        $REPO_ROOT/scripts/kms/endpoints/proposals.sh \
            $WORKSPACE/proposals/set_key_release_policy.json
    else
        AKV_KEY_NAME="member0" ccf-sign \
            "$WORKSPACE/proposals/set_key_release_policy.json" \
                | $REPO_ROOT/scripts/kms/endpoints/proposals.sh
    fi

    set +e
}

release-policy-set "$@"
