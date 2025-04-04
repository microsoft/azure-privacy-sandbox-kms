#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -e

docker compose -p ${UNIQUE_ID:-default} down jwt-issuer --remove-orphans

unset JWT_ISSUER_WORKSPACE
