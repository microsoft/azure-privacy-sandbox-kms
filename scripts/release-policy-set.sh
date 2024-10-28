#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"

# Construct the proposal
cp $REPO_ROOT/$RELEASE_POLICY_PROPOSAL $WORKSPACE/proposals/set_key_release_policy.json

# Submit the proposal
source $REPO_ROOT/scripts/tools/ccf-propose.sh
ccf_propose $WORKSPACE/proposals/set_key_release_policy.json