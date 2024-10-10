#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -euo pipefail

function usage {
    echo ""
    echo "Submit a ccf proposal and automatically vote with acceptance."
    echo ""
    echo "usage: ./submit_proposal.sh --network-url string --certificate-dir <workspace/sandbox_common> string --proposal-file string --member-count number"
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
        --proposal_file) proposal_file="$2"; shift;;
        --certificate_dir) certificate_dir="$2"; shift;;
        --member_count) member_count=$2; shift;;
        --help) usage; exit 0; shift;;
        --) shift;;
    esac
    shift;
done

echo "network_url:" $network_url
echo "certificate_dir: " $certificate_dir
echo "proposal_file:" $proposal_file

# validate parameters
if [[ -z $network_url ]]; then
    failed "Missing parameter --network-url"
elif [[ -z $certificate_dir ]]; then
   failed "You must supply --certificate-dir"
elif [[ -z $proposal_file ]]; then
    failed "Missing parameter --proposal-file"
fi


app_dir=$PWD  # application folder for reference
service_cert="$certificate_dir/service_cert.pem"
signing_cert="$certificate_dir/member0_cert.pem"
signing_key="$certificate_dir/member0_privk.pem"

#cat $proposal_file

# Use parameter expansion to provide default values if AKV_KID and AKV_AUTHORIZATION are undefined
AKV_KID="${AKV_KID:-}"
AKV_AUTHORIZATION="${AKV_AUTHORIZATION:-}"
echo "AKV_KID: $AKV_KID"

# Check if signing needs to happen on AKV
if [[ -n "$AKV_KID" && -n "$AKV_AUTHORIZATION" ]]; then
    echo "Signing proposal with AKV"
    $app_dir/scripts/sign_proposal_akv.sh --network_url $network_url --certificate_dir $certificate_dir --akv_kid $AKV_KID --proposal_file $proposal_file --akv_authorization "$AKV_AUTHORIZATION"
    exit 0
fi

# Sign with local keys
proposal0_id=$( (ccf_cose_sign1 --content $proposal_file --signing-cert $signing_cert --signing-key $signing_key --ccf-gov-msg-type proposal --ccf-gov-msg-created_at $(date -Is)  | curl $network_url/gov/proposals -k -H "Content-Type: application/cose" --data-binary @- --cacert $service_cert -w '\n'| jq -r '.proposal_id') )

# Check if proposal0_id is null or empty
if [ -z "$proposal0_id" ]; then
    echo "Error: proposal0_id is null or empty"
    exit 1
fi

echo Proposal ID: $proposal0_id

# proposal submitter vote for proposal
ccf_cose_sign1 --content ${app_dir}/governance/vote/vote_accept.json --signing-cert $signing_cert --signing-key $signing_key --ccf-gov-msg-type ballot --ccf-gov-msg-created_at $(date -Is) --ccf-gov-msg-proposal_id $proposal0_id | curl $network_url/gov/proposals/$proposal0_id/ballots -k -H "Content-Type: application/cose" --data-binary @- --cacert $service_cert -w '\n'

for ((i = 1 ; i < $member_count ; i++)); do
  signing_cert="$certificate_dir/member${i}_cert.pem"
  signing_key="$certificate_dir/member${i}_privk.pem"
  ccf_cose_sign1 --content ${app_dir}/governance/vote/vote_accept.json --signing-cert $signing_cert --signing-key $signing_key --ccf-gov-msg-type ballot --ccf-gov-msg-created_at $(date -Is) --ccf-gov-msg-proposal_id $proposal0_id | curl $network_url/gov/proposals/$proposal0_id/ballots -k -H "Content-Type: application/cose" --data-binary @- --cacert $service_cert  -w '\n'
done

curl $network_url/gov/proposals/$proposal0_id -k -H "Content-Type: application/json" --cacert $service_cert | jq