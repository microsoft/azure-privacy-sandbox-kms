#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.
set -euo pipefail

# This script will generate an access token for the API and returns the authorization header.

# Get JWT
REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
jwt_token=$(. $REPO_ROOT/jwt_issuers_workspace/default/fetch.sh && jwt_issuer_fetch)

# Set the Authorization header content
auth_header="Bearer $jwt_token"
echo -n $auth_header
