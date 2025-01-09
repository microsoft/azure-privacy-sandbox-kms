#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

# This is intended to be run inside a docker container defined in compose.yml

previous_health=""
while true; do

    az cleanroom ccf network show-health \
        --name ${DEPLOYMENT_NAME} \
        --provider-client ${DEPLOYMENT_NAME}-provider \
        --provider-config /workspace/providerConfig.json | jq > health.json

    if [ "$(cat health.json)" != "$previous_health" ]; then
        cat health.json
        previous_health=$(cat health.json)

        total=$(jq '[.nodeHealth[]] | length' health.json)
        healthy=$(jq '[.nodeHealth[] | select(.status == "Ok")] | length' health.json)

        echo "$healthy/$total nodes healthy"

        if [ $total -ne $healthy ]; then
            az cleanroom ccf network update \
                --name $DEPLOYMENT_NAME \
                --provider-client "$DEPLOYMENT_NAME-provider" \
                --provider-config /workspace/providerConfig.json \
                --node-count $total
        fi
    fi

    sleep $CHECK_INTERVAL
done