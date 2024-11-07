# Signing a proposal using AKV certificate

## Env variables

For production environments we need to sign proposals with an Azure Key Vault (AKV) key.
The script submit_proposal will test if the env variable AKV_KID and AKV_AUTHORIZATION are defined. If these are defined, the script will sign the proposal with the AKV key.

Setting AKV_KID:

```
export AKV_VAULT_NAME="<akv NAME>"
export AKV_CERTIFICATE_NAME="name of the cert"
export AKV_CERTIFICATE_VERSION="<version of certificate>"
export AKV_KID="https://$AKV_VAULT_NAME.vault.azure.net/certificates/$AKV_CERTIFICATE_NAME/$AKV_CERTIFICATE_VERSION"
echo $AKV_KID
```

AKV_AUTHORIZATION is defined as "Bearer ey...". The token is a managed identity which has access to do signatures with the certificate.

If these two env variables are not set, submit_proposal will use a local key stored in the workspace directory. When set, signing will be done on AKV.

## Submit proposal using AKV

export AKV_AUTHORIZATION as managed identity. Format "Bearer ey.."
export AKV_KID points to the AKV certificate

```
scripts/submit_proposal.sh  --network_url $KMS_URL --certificate_dir $KEYS_DIR --proposal_file governance/policies/settings-policy.json
```
