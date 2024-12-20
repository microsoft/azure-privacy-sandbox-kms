#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -e

docker compose -p ${UNIQUE_ID:-default} -f services/docker-compose.yml down jwt-issuer --remove-orphans

unset JWT_ISSUER_WORKSPACE
unset JWT_ISSUER
