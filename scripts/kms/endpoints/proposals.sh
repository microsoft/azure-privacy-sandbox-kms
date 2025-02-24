#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

proposals() {
    curl $KMS_URL/app/proposals \
        -X POST \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

proposals