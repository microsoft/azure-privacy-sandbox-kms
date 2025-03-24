#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.


settings-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh

    # If settings policy not set, use default
    if [ -z "$SETTINGS_POLICY" ]; then
        export SETTINGS_POLICY=$(jq -n '{
            "service": {
                "name": "azure-privacy-sandbox-kms",
                "description": "Key Management Service",
                "version": "1.0.0",
                "debug": false
            }
        }')
    fi

    # Construct the proposal
    envsubst < $REPO_ROOT/governance/proposals/set_settings_policy.json | jq > $WORKSPACE/proposals/set_settings_policy.json

    # Submit the proposal
    result=$(mktemp)
    if [[ "$KMS_URL" == *"confidential-ledger.azure.com" ]]; then
        AKV_KEY_NAME="user0" ccf-sign \
            "$WORKSPACE/proposals/set_settings_policy.json" \
                | $REPO_ROOT/scripts/kms/endpoints/proposals.sh | tee $result
    else
        $REPO_ROOT/scripts/kms/endpoints/proposals.sh \
            $WORKSPACE/proposals/set_settings_policy.json | tee $result
    fi

    # Check if the last line of result is 200
    if [ "$(tail -n 1 $result)" -ne 200 ]; then
        echo "Error: Proposal submission failed."
        exit 1
    fi

    set +e
}

settings-policy-set