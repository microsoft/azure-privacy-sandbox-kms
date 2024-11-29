#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

az-cleanroom-aci-setup() {
    az storage blob download \
        --account-name azurekmsstorage \
        --container-name azure-cleanroom \
        --name cleanroom-1.0.0-py2.py3-none-any.whl \
        --auth-mode login \
        --file /tmp/cleanroom-1.0.0-py2.py3-none-any.whl > /dev/null

    az extension add -y --allow-preview true --upgrade \
        --source /tmp/cleanroom-1.0.0-py2.py3-none-any.whl

    rm /tmp/cleanroom-1.0.0-py2.py3-none-any.whl
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    az-cleanroom-aci-setup "$@"
fi