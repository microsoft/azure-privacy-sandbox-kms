#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

persistent_resources=(
    "azurekms:Microsoft.ContainerRegistry/registries"
    "azure-key-management-service-id:Microsoft.ManagedIdentity/userAssignedIdentities"
    "azurekmsstorage:Microsoft.Storage/storageAccounts"
)

resources_json=$(az resource list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[].{name:name, type:type, id:id}" \
    -o json
)

echo "$resources_json" | jq -c '.[]' | while read -r resource; do
    name=$(echo "$resource" | jq -r '.name')
    type=$(echo "$resource" | jq -r '.type')
    id=$(echo "$resource" | jq -r '.id')

    skip=false
    for persistent_resource in "${persistent_resources[@]}"; do
        if [ "$persistent_resource" = "${name}:${type}" ]; then
            echo "Skipping persistent resource: $name ($type)"
            skip=true
            break
        fi
    done

    if [ "$skip" = false ]; then
        echo "Deleting resource: $name ($type)"
        az resource delete --ids "$id"
    fi
done