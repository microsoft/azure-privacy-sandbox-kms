#!/bin/bash

# filepath: /workspaces/azure-privacy-sandbox-kms/scripts/kms/settings_policy_set.sh
#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

settings-policy-set() {
    set -e

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

    # Default settings policy
    SETTINGS_POLICY_DEFAULT=$(jq -n '{
        "service": {
            "name": "azure-privacy-sandbox-kms",
            "description": "Key Management Service",
            "version": "1.0.0",
            "debug": false
        }
    }')

    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --policy)
                POLICY="$2"
                shift 2
                ;;
            --debug)
                DEBUG="$2"
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1"
                exit 1
                ;;
        esac
    done

    # Modify SETTINGS_POLICY_DEFAULT if debug argument is set
    if [ -n "$DEBUG" ]; then
        SETTINGS_POLICY_DEFAULT=$(echo "$SETTINGS_POLICY_DEFAULT" | jq --argjson debug "$DEBUG" '.service.debug = $debug')
    fi

    # If policy is set, use it; otherwise, use default
    if [ -n "$POLICY" ]; then
        SETTINGS_POLICY="$POLICY"
    else
        SETTINGS_POLICY="$SETTINGS_POLICY_DEFAULT"
    fi

    # Export the SETTINGS_POLICY variable to make it available to subsequent commands
    export SETTINGS_POLICY

    # Construct the proposal by substituting environment variables in the template
    envsubst < $REPO_ROOT/governance/proposals/set_settings_policy.json | jq > $WORKSPACE/proposals/set_settings_policy.json

    # Submit the proposal
    source $REPO_ROOT/scripts/ccf/propose.sh
    ccf-propose $WORKSPACE/proposals/set_settings_policy.json

    set +e
}

settings-policy-set "$@"