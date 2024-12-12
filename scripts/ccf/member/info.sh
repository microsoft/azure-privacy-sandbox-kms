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
    if_active_member=`curl -s $KMS_URL/gov/service/members?api-version=2024-07-01 \
        --cacert $KMS_SERVICE_CERT_PATH \
        | jq -e ".value[] | select(.memberId==\"$MEMBER_ID\")"`

    if [ -n "$if_active_member" ]; then
        echo $if_active_member
        return
    fi
    export MEMBER_CERT=$(cat $WORKSPACE/${MEMBER_NAME}_cert.pem)

    # Otherwise look for open proposals to add the member
    open_proposals=`curl -s $KMS_URL/gov/members/proposals?api-version=2024-07-01 \
        --cacert $KMS_SERVICE_CERT_PATH \
        | jq -r '.value[] | select(.proposalState == "Open") | .proposalId'`

    for proposalId in $open_proposals; do
        proposal=`curl -s "$KMS_URL/gov/members/proposals/$proposalId/actions?api-version=2024-07-01" \
            --cacert $KMS_SERVICE_CERT_PATH`

        if [ "$(echo "$proposal" | jq -r '.actions[0].name')" = "set_member" ]; then
            if [ "$(echo "$proposal" | jq -r '.actions[0].args.cert')" = "$MEMBER_CERT" ]; then
                export PROPOSAL_ID=$proposalId
                jq -n '{
                    certificate: env.MEMBER_CERT,
                    memberId: env.MEMBER_ID,
                    proposalId: env.PROPOSAL_ID,
                    status: "Open"
                }'
                return
            fi
        fi
    done

    jq -n '{
        certificate: env.MEMBER_CERT,
        memberId: env.MEMBER_ID,
        status: "Unknown"
    }'
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-info "$@"
fi
