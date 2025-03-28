#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

propose_set_js_app() {
  # For plain CCF, application code is set via a governance proposal

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
}


call_user_defined_endpoints() {
  # For ACL based applications, application code is set by calling an endpoint

  # TODO: Flesh out a proper auth implementation, for now:
  # Get the current users bearer token
  export TOKEN=$(az account get-access-token --resource https://confidential-ledger.azure.com | jq -r '.accessToken')

  curl -k \
    -X PUT -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d @$REPO_ROOT/dist/bundle.json \
    "$KMS_URL/app/userDefinedEndpoints?api-version=2024-08-22-preview"

  echo "userDefinedEndpoints set"
}


js-app-set() {
  set -e

  # Build the KMS bundle
  npm install && npm run build

  if [[ "$KMS_URL" == *"confidential-ledger.azure.com" ]]; then
    call_user_defined_endpoints
  else
    propose_set_js_app
  fi

  set +e
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  js-app-set "$@"
fi