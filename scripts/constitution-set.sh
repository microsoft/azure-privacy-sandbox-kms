#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"

# Construct the proposal
cat "$WORKSPACE/sandbox_common/actions.js" > $WORKSPACE/proposals/constitution.js
cat "$WORKSPACE/sandbox_common/apply.js" >> $WORKSPACE/proposals/constitution.js
cat "$WORKSPACE/sandbox_common/resolve.js" >> $WORKSPACE/proposals/constitution.js
cat "$WORKSPACE/sandbox_common/validate.js" >> $WORKSPACE/proposals/constitution.js
cat "$CONSTITUTION_PATH" >> $WORKSPACE/proposals/constitution.js
jq --arg constitution "$(tr -s ' ' < "$WORKSPACE/proposals/constitution.js")" \
  '.actions[0].args.constitution = $constitution' \
    $REPO_ROOT/governance/proposals/set_constitution.json > $WORKSPACE/proposals/set_constitution.json

# Submit the proposal
source $REPO_ROOT/scripts/tools/ccf-propose.sh
ccf_propose $WORKSPACE/proposals/set_constitution.json