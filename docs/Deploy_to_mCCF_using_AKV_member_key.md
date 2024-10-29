# Deploy to mCCF using AKV member key

## Get service cert

```
export KEYS_DIR=vol
cd $KEYS_DIR
export CCF_NAME=<name of mCCF instance>
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export identityurl=https://identity.confidential-ledger.core.azure.com/ledgerIdentity/${CCF_NAME}
curl $identityurl | jq ' .ledgerTlsCertificate' | xargs echo -e > $KEYS_DIR/service_cert.pem
```

## Login to azure

```
sudo apt-get update
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login
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

## Retrieve the certificate from AKV

```
az keyvault certificate download --vault-name $AKV_VAULT_NAME --name $AKV_CERTIFICATE_NAME --file $KEYS_DIR/${AKV_CERTIFICATE_NAME}_cert.pem --encoding PEM
```

## Retrieve all members of KMS

```
curl $KMS_URL/gov/members --cacert $KEYS_DIR/service_cert.pem | jq
```

## Set custom constitution

```
make set-constitution
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

# Show key release policy

```
curl ${KMS_URL}/app/keyReleasePolicy --cacert ${KEYS_DIR}/service_cert.pem -H "Authorization:$AUTHORIZATION" -H "Content-Type: application/json" -w '\n' | jq
AUTHORIZATION: Managed identity supported by KMS JWT policy
```
