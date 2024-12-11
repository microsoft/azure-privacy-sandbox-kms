#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

js-app-set() {
  set -e

  REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

  # Build the KMS bundle
  npm install && npm run build

  # Adapt template line by line since bundle.json is too big for sed or awk
  temp_file=$(mktemp)
  while IFS= read -r line; do
    if [[ "$line" == *"\${BUNDLE}"* ]]; then
      echo "${line/\"\$\{BUNDLE\}\"\,/}" >> "$temp_file"
      cat $REPO_ROOT/dist/bundle.json >> "$temp_file"
      echo -e "," >> "$temp_file"
    else
      echo "$line" >> "$temp_file"
    fi
  done < $REPO_ROOT/governance/proposals/set_js_app.json
  mv "$temp_file" $WORKSPACE/proposals/set_js_app.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_js_app.json

  set +e
}

js-app-set "$@"
