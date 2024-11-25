#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

az-cleanroom-aci-setup() {
    az extension add -y --allow-preview true \
    --source https://cleanroomazcli.blob.core.windows.net/azcli/cleanroom-0.0.7-py2.py3-none-any.whl
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    az-cleanroom-aci-setup "$@"
fi