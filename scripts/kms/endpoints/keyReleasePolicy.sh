#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

keyReleasePolicy() {
    curl $KMS_URL/app/keyReleasePolicy \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

keyReleasePolicy