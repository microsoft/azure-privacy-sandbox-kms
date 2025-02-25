#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

proposals() {
    curl $KMS_URL/app/proposals \
        -X POST \
        -H "Content-Type: application/json" \
        -d @"$@" \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

proposals "$@"