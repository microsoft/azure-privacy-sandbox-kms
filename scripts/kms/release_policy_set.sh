#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

release-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    RELEASE_POLICY_PROPOSAL=$1

    # Construct the proposal
    cp $REPO_ROOT/$RELEASE_POLICY_PROPOSAL $WORKSPACE/proposals/set_key_release_policy.json

    # Submit the proposal
    source $REPO_ROOT/scripts/ccf/propose.sh
    ccf-propose $WORKSPACE/proposals/set_key_release_policy.json

    set +e
}

release-policy-set "$@"
