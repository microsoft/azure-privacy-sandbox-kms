#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -euo pipefail

function usage {
    echo ""
    echo "Submit a ccf constitution and automatically vote with acceptance."
    echo ""
    echo "usage: ./submit_constitution.sh --network-url string  --custom-constitution string --certificate-dir <workspace/sandbox_common> string"
    echo ""
    echo "  --network-url               string      ccf network url (example: https://test.confidential-ledger.azure.com)"
    echo "  --certificate-dir           string      The directory where the certificates are"
    echo "  --custom-constitution       string      path to any governance proposal to submit (example: dist/set_js_app.json)"
    echo "  --member-count              number      number of network members need to approve the proposal"
    echo ""
    exit 0
}

function failed {
    printf "Script failed: %s\n\n" "$1"
    exit 1
}

# Initialize the variables to empty strings
network_url=""
certificate_dir=""
custom_constitution=""
member_count=1

while [ $# -gt 0 ]
do
    name="${1/--/}"
    name="${name/-/_}"
    case "--$name"  in
        --network_url) network_url="$2"; shift;;
        --custom_constitution) custom_constitution="$2"; shift;;
        --certificate_dir) certificate_dir="$2"; shift;;
        --member_count) member_count=$2; shift;;
        --help) usage; exit 0; shift;;
        --) shift;;
    esac
    shift;
done

slurp_file() {
  cat "$1" | sed 's/"/\\"/g'
}

echo "Network URL: $network_url"
echo "Certificate Directory: $certificate_dir"
echo "Custom Constitution File: $custom_constitution"

# validate parameters
if [[ -z $network_url ]]; then
    failed "Missing parameter --network-url"
elif [[ -z $certificate_dir ]]; then
   failed "You must supply --certificate-dir"
fi

common_dir=$certificate_dir  # common folder

# Create constitution
cat "$common_dir/actions.js" > "$common_dir/constitution.js"
cat "$common_dir/apply.js" >> "$common_dir/constitution.js"
cat "$common_dir/resolve.js" >> "$common_dir/constitution.js"
cat "$common_dir/validate.js" >> "$common_dir/constitution.js"

if [[ -z $custom_constitution ]]; then
    echo "No custom constitution specified"
else
    echo "Add custom constitution: $custom_constitution"
    cat "$custom_constitution" >> "$common_dir/constitution.js"
fi

# Read the file and output its content as a string
escaped_js=$(jq -Rs . < "$common_dir/constitution.js")
serialized="$escaped_js"

# create proposal
echo -n '{
  "actions": [
    {
      "name": "set_constitution",
      "args": {
        "constitution": '> "$common_dir/constitution_proposal.json"
echo -n $serialized >> "$common_dir/constitution_proposal.json"
echo -n '
      }
    }
]}' >> "$common_dir/constitution_proposal.json"

# propose and vote
./scripts/submit_proposal.sh --network-url  "${network_url}" --proposal-file "$common_dir/constitution_proposal.json" --certificate-dir  "${certificate_dir}" --member-count ${member_count}
echo "New constitution is updated"
