#!/bin/bash

display_usage() {
    echo "Create Azure Key Vault certificate script"
    echo "Usage:"
    echo -e "$0 [-v | --vault] vault_name"
    echo -e "$0 [-c | --create] identity_cert_name"
    echo -e "$0 [-g | --resource-group] resource_group_name"
    echo -e "$0 [-l | --location] location"
    echo -e "$0 [-m | --managed-identity] managed_identity_name"
    echo -e "$0 -h | --help"
    echo ""
}

# Check if the correct number of arguments is provided
if [ $# -le 1 ]; then
    display_usage
    exit 1
fi

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -v|--vault) VAULT_NAME="$2"; shift ;;
        -c|--create) IDENTITY_CERT_NAME="$2"; shift ;;
        -g|--resource-group) RESOURCE_GROUP="$2"; shift ;;
        -l|--location) LOCATION="$2"; shift ;;
        -m|--managed-identity) MANAGED_IDENTITY_NAME="$2"; shift ;;
        -h|--help) display_usage; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; display_usage; exit 1 ;;
    esac
    shift
done

# Check if required arguments are provided
if [ -z "$VAULT_NAME" ] || [ -z "$IDENTITY_CERT_NAME" ] || [ -z "$RESOURCE_GROUP" ] || [ -z "$LOCATION" ] || [ -z "$MANAGED_IDENTITY_NAME" ]; then
    echo "Error: Vault name, certificate name, resource group, location, and managed identity name are required."
    display_usage
    exit 1
fi

# Check if the Key Vault exists
VAULT_EXISTS=$(az keyvault list --query "[?name=='$VAULT_NAME'].name" -o tsv)

if [ -z "$VAULT_EXISTS" ]; then
    echo "Key Vault $VAULT_NAME does not exist. Creating Key Vault..."
    az keyvault create --name $VAULT_NAME --resource-group $RESOURCE_GROUP --location $LOCATION
else
    echo "Key Vault $VAULT_NAME already exists."
fi

# Get the object ID of the managed identity
MANAGED_IDENTITY_OBJECT_ID=$(az identity show --name $MANAGED_IDENTITY_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv)
if [ -z "$MANAGED_IDENTITY_OBJECT_ID" ]; then
    echo "Error: Unable to retrieve the object ID of the managed identity."
    exit 1
fi
echo "Managed Identity Object ID: $MANAGED_IDENTITY_OBJECT_ID"

# Assign Key Vault access policies to the managed identity
az keyvault set-policy --name $VAULT_NAME --object-id $MANAGED_IDENTITY_OBJECT_ID --certificate-permissions get list --key-permissions sign

# Create the JSON file dynamically
JSON_FILE="/tmp/identity_cert_policy.json"
cat <<EOF > $JSON_FILE
{
  "issuerParameters": {
    "certificateTransparency": null,
    "name": "Self"
  },
  "keyProperties": {
    "curve": "P-384",
    "exportable": true,
    "keyType": "EC",
    "reuseKey": true
  },
  "lifetimeActions": [
    {
      "action": {
        "actionType": "AutoRenew"
      },
      "trigger": {
        "daysBeforeExpiry": 90
      }
    }
  ],
  "secretProperties": {
    "contentType": "application/x-pkcs12"
  },
  "x509CertificateProperties": {
    "keyUsage": ["digitalSignature"],
    "subject": "CN=Member",
    "validityInMonths": 12
  }
}
EOF

# Create the certificate in Azure Key Vault
az keyvault certificate create --vault-name $VAULT_NAME -n $IDENTITY_CERT_NAME -p @$JSON_FILE
az keyvault key show --vault-name $VAULT_NAME --name $IDENTITY_CERT_NAME