#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

# This is intended to be run inside a docker container defined in compose.yml

# `show-health` produces a report of the nodes in the network according to CCF.
# The question of how many nodes we want is left to the governance of the
# network, this script merely ensures any nodes the network expects but are actually
# unhealthy in ACI are reprovisioned.

# Start the docker daemon
/usr/local/share/docker-init.sh

# Setup the Azure Cleanroom Client Containers
az cleanroom ccf provider deploy --name ${DEPLOYMENT_NAME}-provider
az cleanroom ccf provider configure --name ${DEPLOYMENT_NAME}-provider \
    --signing-cert /workspace/ccf-operator_cert.pem \
    --signing-key /workspace/ccf-operator_privk.pem

docker compose -p ${DEPLOYMENT_NAME}-provider logs -f &

previous_health=""
while true; do

    az cleanroom ccf network show-health \
        --name ${DEPLOYMENT_NAME} \
        --provider-client ${DEPLOYMENT_NAME}-provider \
        --provider-config /workspace/providerConfig.json | jq > health.json

    # Comparing health.json to a previous health isn't functionally
    # consequential, if the nodes health hasn't changed, `network update` is a
    # no-op, but the check keeps logging concise and reduces unnecessary calls
    # to `network update`.
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