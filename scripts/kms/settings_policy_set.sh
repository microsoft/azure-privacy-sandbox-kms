#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.


settings-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

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
    source $REPO_ROOT/scripts/ccf/propose.sh
    ccf-propose $WORKSPACE/proposals/set_settings_policy.json

    set +e
}

settings-policy-set