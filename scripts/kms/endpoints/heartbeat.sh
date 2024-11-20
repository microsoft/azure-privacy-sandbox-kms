#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

heartbeat() {
    curl $KMS_URL/app/heartbeat \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

heartbeat