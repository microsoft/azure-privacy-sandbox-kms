#!/bin/bash

set -e

curl $KMS_URL/app/hearthbeat \
    --cacert $WORKSPACE/sandbox_common/service_cert.pem \
    --cert $WORKSPACE/sandbox_common/member0_cert.pem \
    --key $WORKSPACE/sandbox_common/member0_privk.pem \
    | jq