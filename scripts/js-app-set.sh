#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"

# Build the KMS bundle
npm install --silent && npm run build

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
echo "}" >> "$temp_file"
mkdir -p $WORKSPACE/proposals
mv "$temp_file" $WORKSPACE/proposals/set_js_app.json

# Submit the proposal
source $REPO_ROOT/scripts/tools/ccf-propose.sh
ccf_propose $WORKSPACE/proposals/set_js_app.json