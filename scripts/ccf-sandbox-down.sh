#!/bin/bash

set -e

echo ""
REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"

if [ "$DEPLOYMENT_ENV" == "local" ]; then
    docker compose -f services/docker-compose.yml down ccf-sandbox --remove-orphans
elif [ "$DEPLOYMENT_ENV" == "cloud" ]; then
    source $REPO_ROOT/services/cacitesting.env
    c-aci-testing aci remove --deployment-name $DEPLOYMENT_NAME
else
    echo "DEPLOYMENT_ENV should be local or cloud, not ${DEPLOYMENT_ENV}"
    exit 1
fi