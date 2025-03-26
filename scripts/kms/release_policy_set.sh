#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

release-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh
    source $REPO_ROOT/scripts/ccf/member/use.sh
    RELEASE_POLICY_PROPOSAL=$1

    # Construct the proposal
    cp $REPO_ROOT/$RELEASE_POLICY_PROPOSAL $WORKSPACE/proposals/set_key_release_policy.json

    (
        # If running on sandbox_local, use the user cert because KMS can only
        # authenticate user COSE signature
        if [[ "$KMS_URL" == "https://127.0.0.1:8000" ]]; then
            ccf-member-use user0
        fi

        # Submit the proposal
        ccf-sign $WORKSPACE/proposals/set_key_release_policy.json \
            | $REPO_ROOT/scripts/kms/endpoints/proposals.sh
    )

    set +e
}

release-policy-set "$@"
