#!/bin/bash

# Function to display usage
ddisplay_usage() {
    echo "Create Azure Key Vault certificate script"
    echo "Usage:"
    echo -e "$0 [-v | --vault] vault_name   name of the vault"
    echo -e "$0 [-c | --create] identity_cert_name  name of the certificate"
    echo -e "$0 [-g | --resource-group] resource_group_name name of the resource group"
    echo -e "$0 [-l | --location] location  location of the vault"
    echo -e "$0 [-m | --managed-identity] managed_identity_name name of the managed identity to access the ceritificate"
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
        -v|--vault) vault_name="$2"; shift ;;
        -c|--create) cert_name="$2"; shift ;;
        -g|--resource_group) resource_group="$2"; shift ;;
        -l|--location) location="$2"; shift ;;
        -m|--managed_identity) managed_identity_name="$2"; shift ;;
        -h|--help) display_usage; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; display_usage; exit 1 ;;
    esac
    shift
done

echo "Vault Name: $vault_name"
echo "Certificate Name: $cert_name"
echo "Resource Group: $resource_group"
echo "Location: $location"
echo "Managed Identity Name: $managed_identity_name"

# Check if required arguments are provided
if [ -z "$vault_name" ] || [ -z "$cert_name" ] || [ -z "$resource_group" ] || [ -z "$location" ] || [ -z "$managed_identity_name" ]; then
    echo "Error: Vault name, certificate name, resource group, location, and managed identity name are required."
    display_usage
    exit 1
fi

# Check if the Key Vault exists and if it has '--enable-rbac-authorization' specified
vault_properties=$(az keyvault show --name "$vault_name" --resource-group "$resource_group" --query "properties" -o json)
if echo "$vault_properties" | grep -q '"enableRbacAuthorization": true'; then
    echo "The Key Vault is configured with '--enable-rbac-authorization'."
    echo "You cannot set access policies directly on this Key Vault."
    echo "Ensuring that the necessary RBAC roles are assigned to the managed identity."

    # Get the managed identity principal ID
    managed_identity_principal_id=$(az identity show --name "$managed_identity_name" --resource-group "$resource_group" --query "principalId" -o tsv)
    if [ -z "$managed_identity_principal_id" ]; then
        echo "Error: Failed to retrieve the managed identity principal ID."
        exit 1
    fi

    # Array of roles to assign
    roles=("Key Vault Certificate User" "Key Vault Crypto User" "Reader")

    # Loop through each role and assign it to the managed identity
    for role in "${roles[@]}"; do
        az role assignment create --role "$role" --assignee "$managed_identity_principal_id" --scope "/subscriptions/$(az account show --query 'id' -o tsv)/resourceGroups/$resource_group/providers/Microsoft.KeyVault/vaults/$vault_name"
        if [ $? -ne 0 ]; then
            echo "Error: Failed to assign the '$role' role to the managed identity."
            exit 1
        fi
    done

    echo "Successfully assigned the 'Key Vault Certificate User' role to the managed identity."
fi

# Your script logic to create the certificate goes here

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
    "exportable": false,
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
az keyvault certificate create --vault-name $vault_name -n $cert_name -p @$JSON_FILE
az keyvault key show --vault-name $vault_name --name $cert_name