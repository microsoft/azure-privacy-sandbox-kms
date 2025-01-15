#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

key_rotation_policy_set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    RELEASE_POLICY_PROPOSAL=$1

    # Construct the proposal
    cp $REPO_ROOT/$RELEASE_POLICY_PROPOSAL $WORKSPACE/proposals/key_rotation_policy.json

    # Submit the proposal
    source $REPO_ROOT/scripts/ccf/propose.sh
    ccf-propose $WORKSPACE/proposals/key_rotation_policy.json

    set +e
}

key_rotation_policy_set "$@"
