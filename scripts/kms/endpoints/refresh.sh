#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

refresh() {
    curl $KMS_URL/app/refresh \
        -X POST \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

refresh