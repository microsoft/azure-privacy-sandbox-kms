#!/bin/bash

set -e

curl $KMS_URL/app/listpubkeys \
    --cacert $WORKSPACE/sandbox_common/service_cert.pem \
    | jq