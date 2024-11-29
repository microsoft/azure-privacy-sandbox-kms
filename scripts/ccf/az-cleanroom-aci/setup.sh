#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

az-cleanroom-aci-setup() {

    # To use the tip of the develop branch of azure-cleanroom we have a manual build:
    #   - The extension .whl is cached in our storage account
    #   - The ccf-provider image is cached in our registry
    # When the latest release has the features we need, namely:
    #   - Specifying SANs for the CCF network
    #   - Specifying provider client name to allow parallel execution
    # We can go back to just fetching the release

    # Custom azcli extension
    az storage blob download \
        --account-name azurekmsstorage \
        --container-name azure-cleanroom \
        --name cleanroom-1.0.0-py2.py3-none-any.whl \
        --auth-mode login \
        --file /tmp/cleanroom-1.0.0-py2.py3-none-any.whl > /dev/null
    az extension add -y --allow-preview true --upgrade \
        --source /tmp/cleanroom-1.0.0-py2.py3-none-any.whl
    rm /tmp/cleanroom-1.0.0-py2.py3-none-any.whl

    # Custom ccf-provider image
    az acr login -n azurekms > /dev/null
    export AZCLI_CCF_PROVIDER_CLIENT_IMAGE=azurekms.azurecr.io/ccf/ccf-provider-client:2.0.0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    az-cleanroom-aci-setup "$@"
fi