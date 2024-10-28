#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
source $REPO_ROOT/scripts/tools/endpoint_retry.sh

endpoint_retry \
    "curl $KMS_URL/app/pubkey?kid=${KID}&FMT=${FMT} \
        --cacert $WORKSPACE/sandbox_common/service_cert.pem"