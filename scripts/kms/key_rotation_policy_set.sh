#!/bin/bash

key_rotation_policy_set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh
    ROTATION_POLICY_PROPOSAL=$1

    # If rotation policy is not set, use default from the proposal file
    if [ -z "$ROTATION_POLICY" ]; then
        ROTATION_POLICY=$(cat "$ROTATION_POLICY_PROPOSAL")
    fi

    # Echo the ROTATION_POLICY to the proposal file
    echo "$ROTATION_POLICY" | jq > "$WORKSPACE/proposals/set_key_rotation_policy.json"

    # Submit the proposal
    if [[ "$KMS_URL" == *"confidential-ledger.azure.com" ]]; then
        AKV_KEY_NAME="user0" ccf-sign \
            "$WORKSPACE/proposals/set_key_rotation_policy.json" \
                | $REPO_ROOT/scripts/kms/endpoints/proposals.sh
    else
        $REPO_ROOT/scripts/kms/endpoints/proposals.sh \
            $WORKSPACE/proposals/set_key_rotation_policy.json
    fi


    set +e
}

key_rotation_policy_set "$@"