#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

settingsPolicy() {
    curl $KMS_URL/app/settingsPolicy \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

settingsPolicy "$@"