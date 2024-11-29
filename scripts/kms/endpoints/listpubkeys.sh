#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

listpubkeys() {
    curl $KMS_URL/app/listpubkeys \
        --cacert $KMS_SERVICE_CERT_PATH \
        -w '\n%{http_code}\n'
}

listpubkeys