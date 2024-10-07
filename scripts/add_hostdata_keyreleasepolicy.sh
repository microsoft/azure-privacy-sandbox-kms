#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -euo pipefail

function usage {
    echo ""
    echo "Add hostdata to the key release policy."
    echo ""
    echo "usage: ./add_hostdata_keyreleasepolicy.sh --network-url string  --hostdata string --certificate-dir <workspace/sandbox_common> string"
    echo ""
    echo "  --network-url               string      ccf network url (example: https://test.confidential-ledger.azure.com)"
    echo "  --certificate-dir           string      The directory where the certificates are"
    echo "  --hostdata                  string      hostdata value we want to add to the key release policy"
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
hostdata=""
member_count=1

while [ $# -gt 0 ]
do
    name="${1/--/}"
    name="${name/-/_}"
    case "--$name"  in
        --network_url) network_url="$2"; shift;;
        --hostdata) hostdata="$2"; shift;;
        --certificate_dir) certificate_dir="$2"; shift;;
        --member_count) member_count=$2; shift;;
        --help) usage; exit 0; shift;;
        --) shift;;
    esac
    shift;
done

# Escape double quotes
slurp_file() {
  cat "$1" | sed 's/"/\\"/g'
}

echo "Network URL: $network_url"
echo "Certificate Directory: $certificate_dir"
echo "Hostdata: $hostdata"

# validate parameters
if [[ -z $network_url ]]; then
    failed "Missing parameter --network-url"
elif [[ -z $certificate_dir ]]; then
   failed "You must supply --certificate-dir"
elif [[ -z $hostdata ]]; then
   failed "You must supply --hostdata"
fi

common_dir=$certificate_dir  # common folder

service_cert="$certificate_dir/service_cert.pem"
signing_cert="$certificate_dir/member0_cert.pem"
signing_key="$certificate_dir/member0_privk.pem"

echo "Add hostdata policy: $hostdata"
# Create the JSON content
json_key_release_policy=$(cat <<EOF
{
  "actions": [
    {
      "name": "set_key_release_policy",
      "args": {
        "service": "some service",
        "type": "add",
        "claims": {
          "x-ms-sevsnpvm-hostdata": "$hostdata"
        }
      }
    }
  ]
}
EOF
)
echo "$json_key_release_policy" > "$common_dir/hostdata_krp.json"

# Read the file and output its content as a string
#escaped_js=$(jq -Rs . < "$common_dir/constitution.js")
#serialized="$escaped_js"

# propose and vote
./scripts/submit_proposal.sh --network-url  "${network_url}" --proposal-file "$common_dir/hostdata_krp.json" --certificate-dir  "${certificate_dir}" --member-count ${member_count}
