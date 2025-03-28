#!/bin/bash

key_rotation_policy_set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh
    source $REPO_ROOT/scripts/ccf/member/use.sh
    ROTATION_POLICY_PROPOSAL=$1

    # If rotation policy is not set, use default from the proposal file
    if [ -z "$ROTATION_POLICY" ]; then
        ROTATION_POLICY=$(cat "$ROTATION_POLICY_PROPOSAL")
    fi

    # Echo the ROTATION_POLICY to the proposal file
    echo "$ROTATION_POLICY" | jq > "$WORKSPACE/proposals/set_key_rotation_policy.json"

    (
        # If running on sandbox_local, use the user cert because KMS can only
        # authenticate user COSE signature
        if [[ "$KMS_URL" == "https://127.0.0.1:8000" ]]; then
            ccf-member-use user0
        fi

        # Submit the proposal
        ccf-sign $WORKSPACE/proposals/set_key_rotation_policy.json \
            | $REPO_ROOT/scripts/kms/endpoints/proposals.sh
    )

    set +e
}

key_rotation_policy_set "$@"