#!/bin/bash

set -e

if [ "$DEPLOYMENT_ENV" == "local" ]; then
    docker compose exec ccf-sandbox /bin/bash -c 'tail -f workspace/sandbox_0/out'
elif [ "$DEPLOYMENT_ENV" == "cloud" ]; then
    echo cloud
else
    echo "DEPLOYMENT_ENV should be local or cloud, not ${DEPLOYMENT_ENV}"
    exit 1
fi