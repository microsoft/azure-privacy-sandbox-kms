#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

constitution-set() {
  set -e

  REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
  CONSTITUTION_PATH=$1

  # Get the current constitution
  curl -s -k $KMS_URL/gov/service/constitution?api-version=2024-07-01 > $WORKSPACE/proposals/constitution.js

  # Append the consitution given
  cat "$CONSTITUTION_PATH" >> $WORKSPACE/proposals/constitution.js

  # Construct the proposal
  jq --arg constitution "$(tr -s ' ' < "$WORKSPACE/proposals/constitution.js")" \
    '.actions[0].args.constitution = $constitution' \
      $REPO_ROOT/governance/proposals/set_constitution.json > $WORKSPACE/proposals/set_constitution.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_constitution.json

  set +e
}

constitution-set "$@"
