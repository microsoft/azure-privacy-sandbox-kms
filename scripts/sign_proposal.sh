#!/bin/bash

# Variables
VAULT_NAME="ronnybjkms"
KEY_NAME="member0"
KEY_VERSION="42d173973cd2419688f3c1f81907b126"  #pragma: allowlist secret
IDENTITY_AKV_KID="https://$VAULT_NAME.vault.azure.net/keys/$KEY_NAME/$KEY_VERSION"
API_VERSION="7.1"
TBS_FILE="$KEYS_DIR/tbs"
SIGNATURE_FILE="$KEYS_DIR/signature"
CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CONTENT_FILE="governance/policies/settings-policy.json"
SIGNING_CERT="$KEYS_DIR/member0.crt"
COSE_SIGN1_FILE="$KEYS_DIR/cose_sign1"
CACERT_FILE="$KEYS_DIR/service_cert.pem"
PROPOSAL_URL="$KMS_URL/gov/members/proposals:create?api-version=2024-07-01"

# Perform the curl request to sign the data
curl -s -X POST "$IDENTITY_AKV_KID/sign?api-version=$API_VERSION" \
  --data @$TBS_FILE \
  -H "Authorization: $AUTHORIZATION" \
  -H "Content-Type: application/json" > $SIGNATURE_FILE

# Check if the signature was retrieved successfully
if [ ! -s $SIGNATURE_FILE ]; then
    echo "Failed to retrieve signature"
    exit 1
fi

# Perform the ccf_cose_sign1_finish command and pipe the output to curl
ccf_cose_sign1_finish \
  --ccf-gov-msg-type proposal \
  --ccf-gov-msg-created_at $CREATED_AT \
  --content $CONTENT_FILE \
  --signing-cert $SIGNING_CERT \
  --signature $SIGNATURE_FILE > $COSE_SIGN1_FILE \
| curl $PROPOSAL_URL \
  --cacert $CACERT_FILE \
  --data-binary @- \
  -H "content-type: application/cose"