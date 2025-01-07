#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

THIS_DIR="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
REPO_ROOT="$(realpath "$THIS_DIR/../../..")"

az-cleanroom-aci-scale-nodes() {

    source $REPO_ROOT/services/cacitesting.env
    if [ -n "$1" ] && [ "$1" != "-n" ] && [ "$1" != "--node-count" ]; then
        DEPLOYMENT_NAME="$1"
        shift
    fi
    if [ -z "$DEPLOYMENT_NAME" ]; then
        read -p "Enter deployment name: " DEPLOYMENT_NAME
    fi

    node_count=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--node-count)
                node_count="$2"
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1"
                return 1
                ;;
        esac
    done

    if [ -z $node_count ]; then
        read -p "Enter node count to scale to: " node_count
    fi

    retries=10
    success=false
    while [ $success = false ] && [ $retries -gt 0 ]; do
        az cleanroom ccf network update \
            --name $DEPLOYMENT_NAME \
            --provider-client "$DEPLOYMENT_NAME-provider" \
            --provider-config $WORKSPACE/providerConfig.json \
            --node-count $node_count
        if [ $? -eq 0 ]; then
            success=true
        fi
        ((retries--))
    done
}

az-cleanroom-aci-scale-nodes "$@"
