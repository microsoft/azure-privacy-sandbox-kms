#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.
set -euo pipefail

# This script will generate an access token for the API and returns the authorization header.

# Get JWT
jwt_token=$(. jwt_issuers_workspace/default/fetch.sh && jwt_issuer_fetch)

# Set the Authorization header content
auth_header="Bearer $jwt_token"
echo -n $auth_header
