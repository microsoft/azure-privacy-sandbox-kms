#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -euo pipefail

function usage {
    echo ""
    echo "Submit a ccf proposal and automatically vote with acceptance."
    echo ""
    echo "usage: ./kms_setup.sh --network-url string --certificate-dir <workspace/sandbox_common> string --proposal-file string --member-count number"
    echo ""
    echo "  --network-url           string      ccf network url (example: https://test.confidential-ledger.azure.com)"
    echo "  --certificate-dir       string      The directory where the certificates are"
    echo "  --proposal-file         string      path to any governance proposal to submit (example: dist/set_js_app.json)"
    echo "  --member-count          number      number of network members need to approve the proposal"
    echo ""
    exit 0
}

function failed {
    printf "Script failed: %s\n\n" "$1"
    exit 1
}

# parse parameters

if [ $# -eq 0 ]; then
    usage
    exit 1
fi

member_count=1

while [ $# -gt 0 ]
do
    name="${1/--/}"
    name="${name/-/_}"
    case "--$name"  in
        --network_url) network_url="$2"; shift;;
        --certificate_dir) certificate_dir="$2"; shift;;
        --help) usage; exit 0; shift;;
        --) shift;;
    esac
    shift;
done

echo $network_url
echo $certificate_dir

# validate parameters
if [[ -z $network_url ]]; then
    failed "Missing parameter --network-url"
elif [[ -z $certificate_dir ]]; then
   failed "You must supply --certificate-dir"
fi


app_dir=$PWD  # application folder for reference
service_cert="$certificate_dir/service_cert.pem"
signing_cert="$certificate_dir/member0_cert.pem"
signing_key="$certificate_dir/member0_privk.pem"

# Add settings policy
source .venv_ccf_sandbox/bin/activate
make propose-settings-policy

# Add key release policy
make propose-add-key-release-policy

# Add demo validation policy
make propose-jwt-demo-validation-policy

# Add AAD validation policy
make propose-jwt-ms-validation-policy

# Generate a new key item
curl ${network_url}/app/refresh -X POST --cacert $service_cert -H "Content-Type: application/json" -i  -w '\n'
