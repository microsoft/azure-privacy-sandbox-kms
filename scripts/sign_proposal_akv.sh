#!/bin/bash

# Function to display usage
usage() {
    echo "Sign a proposal with a key stored on AKV"
    echo ""
    echo "Usage: $0 --network_url <network_url> --certificate_dir <certificate_dir> --akv_kid <akv_kid> --proposal_file <proposal_file> --akv_authorization <akv_authorization>"
}

# Parse parameters
if [ $# -eq 0 ]; then
    usage
    exit 1
fi

while [ $# -gt 0 ]
do
    case "$1" in
        --network_url) network_url="$2"; shift 2;;
        --certificate_dir) certificate_dir="$2"; shift 2;;
        --akv_kid) akv_kid="$2"; shift 2;;
        --proposal_file) proposal_file="$2"; shift 2;;
        --akv_authorization) akv_authorization="$2"; shift 2;;
        --help) usage; exit 0;;
        --) shift; break;;
        *) echo "Unknown parameter passed: $1"; usage; exit 1;;
    esac
done

# Validate parameters
if [[ -z $network_url ]]; then
    echo "Missing parameter --network_url"
    exit 1
elif [[ -z $certificate_dir ]]; then
    echo "Missing parameter --certificate_dir"
    exit 1
elif [[ -z $akv_kid ]]; then
    echo "Missing parameter --akv_kid"
    exit 1
elif [[ -z $akv_authorization ]]; then
    echo "Missing parameter --akv_authorization"
    exit 1
elif [[ -z $proposal_file ]]; then
    echo "Missing parameter --proposal_file"
    exit 1
fi

# Check if 'certificates' is in the URL
if [[ $akv_kid != *"certificates"* ]]; then
    echo "Error: The URL does not contain 'certificates'."
    exit 1
fi

# Variables
akv_keys_url="${akv_kid/certificates/keys}"
api_version="7.1"
signature_file="$certificate_dir/signature"
created_at=$(date -u +"%Y-%m-%dT%H:%M:%S")
member_name=$(echo "$akv_kid" | awk -F'/' '{print $(NF-1)}')
signing_cert="$certificate_dir/${member_name}_cert.pem"
ccf_services_cert="$certificate_dir/service_cert.pem"
proposal_url="$network_url/gov/members/proposals:create?api-version=2024-07-01"
tbs="$certificate_dir/tbs"
ccf_output_file="$certificate_dir/ccf_output"
headers_file="$certificate_dir/headers"

# Get signing certificate
curl -H "Authorization: $akv_authorization"  \
     -H "Content-Type: application/json"  \
      $akv_kid/?api-version=7.2

# Prepare signature
ccf_cose_sign1_prepare \
    --ccf-gov-msg-type proposal \
    --ccf-gov-msg-created_at $created_at \
    --content $proposal_file \
    --signing-cert $signing_cert >$tbs
echo ""
echo "AKV signature prepared"
cat $tbs

# Perform the curl request to sign the data
curl -s -X POST "$akv_keys_url/sign?api-version=$api_version" \
  --data @$tbs \
  -H "Authorization: $akv_authorization" \
  -H "Content-Type: application/json" > $signature_file
echo ""
echo "AKV signature retrieved"
cat $signature_file
echo ""

# Check if the signature was retrieved successfully
if [ ! -s $signature_file ]; then
    echo "Failed to retrieve signature"
    exit 1
fi

# Perform the ccf_cose_sign1_finish command and capture its output to a file
ccf_cose_sign1_finish \
  --ccf-gov-msg-type proposal \
  --ccf-gov-msg-created_at $created_at \
  --content $proposal_file \
  --signing-cert $signing_cert \
  --signature $signature_file > $ccf_output_file

# Debugging: Print the output from the ccf_cose_sign1_finish command
echo "Output from ccf_cose_sign1_finish written to $ccf_output_file"
cat $ccf_output_file
echo

# Perform the curl request with the captured output from the file
response=$(curl -s -L -w "%{http_code}" -D $headers_file $proposal_url \
  --cacert $ccf_services_cert \
  --data-binary @$ccf_output_file \
  -H "content-type: application/cose")

# Debugging: Print the response from the curl command
echo "Response from curl:"
echo "$response"

# Extract the HTTP status code from the headers
http_code=$(grep HTTP $headers_file | awk '{print $2}')

# Debugging: Print the HTTP status code and response body
echo "HTTP status code: $http_code"

# Extract the proposal ID from the response body
proposal0_id=$(echo "$response" | jq -r '.proposalId')
echo "Proposal submitted: Proposal ID: $proposal0_id"

# Vote the proposal. Remark current restriction, only one member can vote
# Prepare signature
ccf_cose_sign1_prepare \
    --content ./governance/vote/vote_accept.json \
    --ccf-gov-msg-type ballot \
    --ccf-gov-msg-created_at $created_at \
    --ccf-gov-msg-proposal_id $proposal0_id \
    --signing-cert $signing_cert >$tbs
echo "AKV vote signature prepared for proposal $proposal0_id"
cat $tbs

# Perform the curl request to sign the data
curl -L -s -X POST "$akv_keys_url/sign?api-version=$api_version" \
  --data @$tbs \
  -H "Authorization: $akv_authorization" \
  -H "Content-Type: application/json" > $signature_file
echo "AKV signature retrieved"
cat $signature_file

# Perform the ccf_cose_sign1_finish command and pipe the output to curl
ccf_cose_sign1_finish \
    --content ./governance/vote/vote_accept.json \
  --ccf-gov-msg-type ballot \
  --ccf-gov-msg-created_at $created_at \
  --ccf-gov-msg-proposal_id $proposal0_id \
  --signing-cert $signing_cert \
  --signature $signature_file \
| curl -L $network_url/gov/proposals/$proposal0_id/ballots \
  --cacert $ccf_services_cert \
  --data-binary @- \
  -H "content-type: application/cose"

echo "Vote completed for proposal $proposal0_id"