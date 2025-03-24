#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

proposals() {
    USE_AKV=${USE_AKV:-false}

    if [[ "$USE_AKV" == false ]]; then
        curl $KMS_URL/app/proposals \
            -X POST \
            -H "Content-Type: application/json" \
            -d @"$@" \
            --cacert $KMS_SERVICE_CERT_PATH \
            --cert $KMS_MEMBER_CERT_PATH \
            --key $KMS_MEMBER_PRIVK_PATH \
            -w '\n%{http_code}\n'
    else
        curl $KMS_URL/app/proposals \
            -X POST \
            -H "Content-Type: application/cose" \
            --data-binary @- \
            --cacert $KMS_SERVICE_CERT_PATH \
            -w '\n%{http_code}\n'
    fi
}

proposals "$@"