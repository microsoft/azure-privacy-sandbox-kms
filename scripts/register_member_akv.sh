#!/bin/bash

# Function to display usage
usage() {
    echo "Do the CCF procedure to register a new member using a key stored on AKV"
    echo ""
    echo "See https://microsoft.github.io/CCF/main/governance/adding_member.html"
    echo "Usage: $0 --network_url <network_url> --certificate_dir <certificate_dir> --akv_kid <akv_kid> --akv_authorization <akv_authorization>"
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
fi

# Check if 'certificates' is in the URL
if [[ $akv_kid != *"certificates"* ]]; then
    echo "Error: The URL does not contain 'certificates'."
    exit 1
fi

# Variables
akv_keys_url="${akv_kid/certificates/keys}"
api_version="7.1"
signature_file="/tmp/signature"
created_at=`date -uIs`
member_name=$(echo "$AKV_KID" | awk -F'/' '{print $(NF-1)}')
signing_cert="$certificate_dir/${member_name}_cert.pem"
ccf_services_cert="$certificate_dir/service_cert.pem"
fingerprint=$(openssl x509 -noout -fingerprint -sha256 -inform pem -in "$signing_cert" | sed 's/://g' | awk -F= '{print $2}' | tr '[:upper:]' '[:lower:]')
state_digest_url="$network_url/gov/members/state-digests/${fingerprint}"
state_digest_update_url="$state_digest_url:update?api-version=2024-07-01"
state_digest_ack_url="$state_digest_url:ack?api-version=2024-07-01"
tbs="/tmp/tbs"

echo "Update ledget state digest"
echo "create at: " $created_at
echo "State digest ack url: " $state_digest_ack_url
echo "AKV Signing Url: " $akv_keys_url
echo "Signing Cert: " $signing_cert
echo "Fingerprint: " $fingerprint

# Create an empty file called empty_file in /tmp
empty_file="/tmp/empty_file"
rm -f $empty_file
touch $empty_file

# Prepare signature
rm -f $tbs
ccf_cose_sign1_prepare --ccf-gov-msg-type proposal --ccf-gov-msg-created_at $created_at --content $empty_file --signing-cert $signing_cert >$tbs
echo "AKV update state digest signature prepared"
cat $tbs | jq

# Perform the curl request to sign the data

rm -f $signature_file
curl -s -X POST "$akv_keys_url/sign?api-version=$api_version" \
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
  --content $empty_file \
  --signing-cert $signing_cert \
  --signature $signature_file \
  | curl $state_digest_update_url \
  -X POST \
  --cacert $ccf_services_cert  \
  --data-binary @- \
   -H "content-type: application/cose" \
   --cert $signing_cert \
   --silent \
  | jq

state_digest=$(curl ${state_digest_url}?api-version=2024-07-01 --cacert ${KEYS_DIR}/service_cert.pem | jq)
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
curl -s -X POST "$akv_keys_url/sign?api-version=$api_version" \
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
| curl $state_digest_ack_url \
  --cacert $ccf_services_cert \
  --data-binary @- \
  --silent \
  -w "\n" \
  -H "content-type: application/cose" \
  | jq

rm -f $state_digest_file
echo "member registered"
