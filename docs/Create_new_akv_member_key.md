# Create new AKV member key
## Create AKV certificate
Use the script:
```
scripts/create_member_cert_akv.sh \
    -v  name of the vault \
    -c  name of the certificate \
    -rg resource group name where vault is resident
    -l  location  where vault is resident e.g. westeurope
    -mi name of the managed identity to access the ceritificate
```
The user needs to be owner of the subscription with role activated in order to create the key and the roles.
## Register the new member key on the CCF network
Use the script:
```
scripts/register_member_akv.sh \
    --network_url $KMS_URL
    --certificate_dir $KEYS_DIR \
    --akv_kid $AKV_KID  \
    --akv_authorization "$AKV_AUTHORIZATION"
```
KMS_URL should point to the main KMS endpoint.
KMS_DIR Directory where to store the certificates used by KMS
AKV_KID Url to the AKV certificate. See [Test the certificate](#test-the-certificate)
AKV_AUTHORIZATION JWT used to access AKV
## Test the certificate
Doing a signature proves that the managed identity has access to the AKV certificate
```
export AKV_VAULT_NAME="<vault name>"
export AKV_CERTIFICATE_NAME="<certifcate name>>"
export AKV_CERTIFICATE_VERSION="<certificate version>"
export AKV_KID="https://$AKV_VAULT_NAME.vault.azure.net/keys/$AKV_CERTIFICATE_NAME/$AKV_CERTIFICATE_VERSION"  # use keys instead of certifcates for signing
echo $AKV_KID

curl "$AKV_KID/sign?api-version=7.4" -H "Authorization: $AKV_AUTHORIZATION" -H "Content-type: application/json" -d '{"alg": "ES384",  "value": "AQIDBAUGBwgJCgECAwQFBgcICQoBAgMEBQYHCAkKAQIDBAUGBwgJCgECAwQFBgcI"}'
```