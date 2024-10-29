# Using mCCF with AKV member key

## Set env variables

```
# AKV_KID
export CCF_NAME="<your mCCF instance>"
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export KEYS_DIR=${PWD}/vol
export AKV_VAULT_NAME="AKV name"
export AKV_CERTIFICATE_NAME="member0"
export AKV_CERTIFICATE_VERSION="version of certificate"
export AKV_KID="https://$AKV_VAULT_NAME.vault.azure.net/certificates/$AKV_KEY_NAME/$KEY_VERSION"
echo $AKV_KID
# AKV_AUTHORIZATION
export AKV_AUTHORIZATION="Bearer ey..."
```

## Test signing and access to signing certificate

```
curl "$AKV_KID/sign?api-version=7.4" -H "Authorization: $AKV_AUTHORIZATION" -H "Content-type: application/json" -d '{"alg": "ES384",  "value": "AQIDBAUGBwgJCgECAwQFBgcICQoBAgMEBQYHCAkKAQIDBAUGBwgJCgECAwQFBgcI"}'
```

## Test AKV key by signing a proposal

```
scripts/submit_proposal.sh  --network_url $KMS_URL --certificate_dir $KEYS_DIR --proposal_file governance/policies/settings-policy.json
```
