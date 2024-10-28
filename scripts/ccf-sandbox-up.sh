#!/bin/bash

set -e

echo ""

if [ "$DEPLOYMENT_ENV" == "local" ]; then
    docker compose -f services/docker-compose.yml up ccf-sandbox --wait
elif [ "$DEPLOYMENT_ENV" == "cloud" ]; then
    echo cloud
else
    echo "DEPLOYMENT_ENV should be local or cloud, not ${DEPLOYMENT_ENV}"
    exit 1
fi

sudo chown $USER:$USER -R $WORKSPACE