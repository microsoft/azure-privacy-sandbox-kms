#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
export WORKSPACE=$(realpath ${WORKSPACE:-$REPO_ROOT/workspace})

docker compose -f services/docker-compose.yml up jwt-issuer --wait --build

sudo chown $USER:$USER -R $WORKSPACE