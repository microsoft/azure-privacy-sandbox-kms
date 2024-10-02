#!/bin/bash

# Function to display usage
usage() {
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

# Variables
api_version="7.1"
signature_file="vol/signature"
created_at=`date -uIs`
signing_cert="$certificate_dir/member1_cert.pem"
cose_sign1_file="vol/cose_sign1"
ccf_services_cert="$certificate_dir/service_cert.pem"
proposal_url="$network_url/gov/members/state-digests/385be3de9ae7d8874636f73f2d273ee44f83847f0e15a238c02345cf94b230a7:ack?api-version=2024-07-01"
tbs="/tmp/tbs"

echo "Update ledget state digest"
echo "create at: " $created_at

# Prepare signature
ccf_cose_sign1_prepare --ccf-gov-msg-type proposal --ccf-gov-msg-created_at $created_at --content vol/empty_file --signing-cert $signing_cert >$tbs
echo "AKV update state digest signature prepared"
cat $tbs | jq

# Perform the curl request to sign the data
rm -f $signature_file
curl -s -X POST "$akv_kid/sign?api-version=$api_version" \
  --data @$tbs \
  -w "\n" \
  -H "Authorization: $akv_authorization" \
  -H "Content-Type: application/json" > $signature_file
echo "AKV update state digest signature retrieved"
cat $signature_file | jq

# Check if the signature was retrieved successfully
if [ ! -s $signature_file ]; then
    echo "Failed to retrieve signature"
    exit 1
fi
echo "Start finishing the update state digest signature"

#  update and retrieve the latest state digest
ccf_cose_sign1_finish \
  --ccf-gov-msg-type state_digest  \
  --ccf-gov-msg-created_at $created_at \
  --content vol/empty_file \
  --signing-cert $signing_cert \
  --signature $signature_file \
  | curl "$network_url/gov/members/state-digests/385be3de9ae7d8874636f73f2d273ee44f83847f0e15a238c02345cf94b230a7:update?api-version=2024-07-01" \
  -X POST \
  --cacert $ccf_services_cert  \
  --data-binary @- \
   -H "content-type: application/cose" \
   --cert $signing_cert \
   --silent \
  | jq

state_digest=$(curl $KMS_URL/gov/members/state-digests/385be3de9ae7d8874636f73f2d273ee44f83847f0e15a238c02345cf94b230a7?api-version=2024-07-01 --cacert ${KEYS_DIR}/service_cert.pem | jq)
# Write the state digest to a temporary file
state_digest_file=$(mktemp)
echo "$state_digest" > "$state_digest_file"
cat $state_digest_file | jq
echo "sign state digest"

# Prepare signature
ccf_cose_sign1_prepare --ccf-gov-msg-type ack --ccf-gov-msg-created_at $created_at --content "$state_digest_file" --signing-cert $signing_cert >$tbs
echo "AKV state digest signature prepared"
cat $tbs | jq

# Perform the curl request to sign the data
rm -f $signature_file
curl -s -X POST "$akv_kid/sign?api-version=$api_version" \
  --data @$tbs \
  -w "\n" \
  -H "Authorization: $akv_authorization" \
  -H "Content-Type: application/json" > $signature_file
echo "AKV state digest signature retrieved"
cat $signature_file | jq

# Check if the signature was retrieved successfully
if [ ! -s $signature_file ]; then
    echo "Failed to retrieve signature"
    exit 1
fi
echo "Start finishing the state digest signature"


# Perform the ccf_cose_sign1_finish command and pipe the output to curl
ccf_cose_sign1_finish \
  --ccf-gov-msg-type ack  \
  --ccf-gov-msg-created_at $created_at \
  --content "$state_digest_file" \
  --signing-cert $signing_cert \
  --signature $signature_file \
| curl $proposal_url \
  --cacert $ccf_services_cert \
  --data-binary @- \
  --silent \
  -w "\n" \
  -H "content-type: application/cose" \
  | jq
