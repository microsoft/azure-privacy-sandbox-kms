#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.


ccf-vote() {

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
    source $REPO_ROOT/scripts/ccf/sign.sh
    proposal_id=$1
    vote=$2

    echo "Voting $vote on $proposal_id"

    ccf-sign \
        $REPO_ROOT/governance/vote/vote_${vote}.json \
        ballot \
        --ccf-gov-msg-proposal_id $proposal_id \
        | curl -s $KMS_URL/gov/proposals/$proposal_id/ballots \
                -H "Content-Type: application/cose" \
                --data-binary @- \
                --cacert $KMS_SERVICE_CERT_PATH \
                | jq
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    ccf-vote "$@"
fi
