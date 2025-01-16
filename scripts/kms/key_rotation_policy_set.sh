#!/bin/bash

key_rotation_policy_set() {
    set -ex

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    ROTATION_POLICY_PROPOSAL=$1

    # If rotation policy is not set, use default from the proposal file
    if [ -z "$ROTATION_POLICY" ]; then
        ROTATION_POLICY=$(cat "$ROTATION_POLICY_PROPOSAL")
    fi

    # Echo the ROTATION_POLICY to the proposal file
    echo "$ROTATION_POLICY" | jq > "$WORKSPACE/proposals/set_key_rotation_policy.json"

    # Submit the proposal
    source "$REPO_ROOT/scripts/ccf/propose.sh"
    ccf-propose "$WORKSPACE/proposals/set_key_rotation_policy.json"

    set +e
}

key_rotation_policy_set "$@"