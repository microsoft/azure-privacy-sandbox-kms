#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

proposalsGet() {
    curl $KMS_URL/app/proposals \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

proposalsGet "$@"