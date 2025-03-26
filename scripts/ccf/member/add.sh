#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"

ccf-member-add-gov() {

    cert_path=$1
    export MEMBER_NAME=$(basename "$cert_path" "_cert.pem")

    # Propose adding the member to the network
    MEMBER_CERT=$(jq -Rs . < $cert_path) \
        envsubst < $REPO_ROOT/governance/proposals/set_member.json | jq \
            > $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json
    ccf-propose $WORKSPACE/proposals/set_member_${MEMBER_NAME}.json

    # Check if the proposal is accepted, otherwise early out with instructions to wait
    if [ `ccf-member-info | jq -r '.status'` != "Accepted" ]; then
        if [ `ccf-member-info | jq -r '.status'` == "Open" ]; then
            echo -e \
            "Proposal submitted, await sufficient votes for members to be accepted\n" \
            "Check member status with:\n" \
            "$REPO_ROOT/scripts/ccf/member/info.sh"
            return 0
        else
            return 1
        fi
    fi

    ( # Use a subshell to temporarily operate as the new member
        ccf-member-use $MEMBER_NAME

        # Otherwise activate member
        state_digest_file=$(mktemp)
        ccf-sign `mktemp` state_digest \
            | curl -s $KMS_URL/gov/members/state-digests/`ccf-member-id`:update?api-version=2024-07-01 \
                -X POST \
                -H "Content-Type: application/cose" \
                --data-binary @- \
                --cacert $KMS_SERVICE_CERT_PATH \
                | jq > $state_digest_file

        ccf-sign $state_digest_file ack \
            | curl -s $KMS_URL/gov/members/state-digests/`ccf-member-id`:ack?api-version=2024-07-01 \
                -H "Content-Type: application/cose" \
                --data-binary @- \
                --cacert $KMS_SERVICE_CERT_PATH
    )
}

ccf-member-add-acl() {
    local member_id=$1
    local roles=$2

    curl $KMS_URL/app/ledgerUsers/$member_id?api-version=2024-08-22-preview \
        --cacert $KMS_SERVICE_CERT_PATH \
        -X PATCH \
        -H "Content-Type: application/merge-patch+json" \
        -H "Authorization: Bearer $(. $JWT_ISSUER_WORKSPACE/fetch.sh && jwt_issuer_fetch)" \
        -d "$(jq -n --arg member_id "$member_id" --argjson roles "$roles" '{
            user_id: $member_id,
            assignedRoles: $roles
        }')"
}

ccf-member-add() {
    set -e

    source $REPO_ROOT/scripts/ccf/propose.sh
    source $REPO_ROOT/scripts/ccf/member/info.sh
    source $REPO_ROOT/scripts/ccf/member/id.sh
    source $REPO_ROOT/scripts/ccf/member/use.sh

    if [[ "$KMS_URL" == *"confidential-ledger.azure.com" ]]; then
        ccf-member-add-acl "$@"
    else
        ccf-member-add-gov "$@"
    fi

    set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-member-add "$@"
fi
