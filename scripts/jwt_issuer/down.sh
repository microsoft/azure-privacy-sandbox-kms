#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -e

docker compose -f services/docker-compose.yml down jwt-issuer --remove-orphans

unset JWT_ISSUER
unset JWT_TOKEN_ISSUER_URL