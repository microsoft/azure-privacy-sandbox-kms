# Assumptions

These guides assume you are running on a github codespace. See [codespaces](https://docs.github.com/en/codespaces/getting-started/quickstart)

Checkout the .devcontainer section to understand how to build a development box.

# Azure Key Vault (AKV) member keys

We have different guides to illustrate how to use AKV member keys.

For production environments we need to sign proposals with an Azure Key Vault (AKV) key.
This signing key will be generated on AKV and will never leave, so customers can leverage the highly protected environment of a Hardware Security Module (HSM).

For more information see [Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-portal).

## Create an AKV member key

[Create an AKV member key](./Create_new_akv_member_key.md)

## Testing an AKV member key

[Testing an AKV member key](./Testing_mCCF_with_AKV_member_key.md)

## Signing a proposal using an AKV member key

[Signing a proposal using an AKV member key](./Signing_a_proposal_using_AKV_certificate.md)

## Deploy to mCCF

[Deploy to mCCF](./Deploy_to_mCCF_using_AKV_member_key.md)
