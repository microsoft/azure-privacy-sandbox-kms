#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.
set -euo pipefail

# This script will generate an access token for the API using the client credentials grant type.
# It assumes that you have created an Identity Provider and setup the .env file with the appropriate values.
# Or you can run `make deploy-ms-idp` to create the Identity Provider and setup the .env file.

# Developer Notes if you want to manually create this in the Portal
########################################################################"
# Generate a JWT token for the application; two applications must be registered in the Azure AD tenant
# Follow: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
# 1. Create the application that is used to generate the token (CLIENT) and create an Enterprise Application with a password
# 2. Create the application that is used to authenticate the token (API) and expose the API
# 3. Replace client_id and client_secret with the AppId and Password from the Service Principal (Enterprise Application)
# 4. Replace scope with the API Identifier URI (Application ID URI)
# 5. Replace src/services/authentication-service.ts with
#    "MS_APP_ID" Client ID from Step 3
#    "MS_APP_ID_URI" Value from Step 4
# 6. Replace your tenant id after https://login.microsoftonline.com"


# if a .env exists then source it
if [ -f aad.env ]; then
  source aad.env
fi

curl -X POST ${AadEndpoint:-$(cat jwt_issuers_workspace/default/jwt_issuer_address)/token} \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${ClientApplicationId:-}&client_secret=${ClientSecret:-}&scope=${ApiIdentifierUri:-}/.default&grant_type=client_credentials" \
    -w "\n"
