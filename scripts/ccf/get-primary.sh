#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-get-primary() {
    echo "https://$(curl -s $1/node/network/nodes/primary --cacert $KMS_SERVICE_CERT_PATH | jq -r '.rpc_interfaces.primary_rpc_interface.published_address')"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-get-primary "$@"
fi