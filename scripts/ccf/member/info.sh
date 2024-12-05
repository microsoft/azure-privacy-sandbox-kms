#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-info() {

    source $REPO_ROOT/scripts/ccf/member/id.sh

    MEMBER_NAME=${1:-$MEMBER_NAME}
    if [ -z "$MEMBER_NAME" ]; then
        read -p "Enter member name: " MEMBER_NAME
    fi
    export MEMBER_NAME

    # First check if the member is active
    export MEMBER_ID=`ccf-member-id $MEMBER_NAME`
    curl -s $KMS_URL/gov/service/members?api-version=2024-07-01 \
        --cacert $KMS_SERVICE_CERT_PATH \
        --key $KMS_MEMBER_PRIVK_PATH \
        --cert $KMS_MEMBER_CERT_PATH \
        | jq -e ".value[] | select(.memberId==\"$MEMBER_ID\")"

}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-info "$@"
fi