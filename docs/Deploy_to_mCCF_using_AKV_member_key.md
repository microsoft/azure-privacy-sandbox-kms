# Deploy to mCCF using AKV member key
## Get service cert
```
export KEYS_DIR=vol
cd $KEYS_DIR
export CCF_NAME=<name of mCCF instance>
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export identityurl=https://identity.confidential-ledger.core.azure.com/ledgerIdentity/${CCF_NAME}
curl $identityurl | jq ' .ledgerTlsCertificate' | xargs echo -e > service_cert.pem
```
## Set AKV env variables
```
export AKV_VAULT_NAME="<akv NAME>"
export AKV_CERTIFICATE_NAME="name of the cert"
export AKV_CERTIFICATE_VERSION="<version of certificate>"
export AKV_KID="https://$AKV_VAULT_NAME.vault.azure.net/certificates/$AKV_CERTIFICATE_NAME/$AKV_CERTIFICATE_VERSION"
echo $AKV_KID
export AKV_AUTHORIZATION="Bearer ey..."
```
## Retrieve all members of KMS
```
curl $KMS_URL/gov/members --cacert service_cert.pem | jq
```
## Set custom constitution
```
./scripts/submit_constitution.sh --network-url $KMS_URL --certificate-dir  $KEYS_DIR --custom-constitution ./governance/constitution/kms_actions.js --member-count 1
```
## Deploy

```
make deploy
```
## Propose and vote new key release policy, settings, jwt policy and create first key
```
make setup
```
# List public keys
```
curl ${KMS_URL}/app/listpubkeys  --cacert $KEYS_DIR/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'
```