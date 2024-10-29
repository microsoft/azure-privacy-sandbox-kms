#!/bin/bash

set -e

echo ""
REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/..")"
mkdir -p $WORKSPACE

if [ "$DEPLOYMENT_ENV" == "local" ]; then
    docker compose -f services/docker-compose.yml up ccf-sandbox --wait

elif [ "$DEPLOYMENT_ENV" == "cloud" ]; then
    source $REPO_ROOT/services/cacitesting.env

    # Deploy the c-aci-testing target
    CCF_PLATFORM=snp c-aci-testing target run services/ccf-sandbox \
        --no-cleanup \
        --deployment-name $DEPLOYMENT_NAME \
        --policy-type 'allow_all'

    # Await the KMS starting
    export KMS_URL="https://$DEPLOYMENT_NAME.${LOCATION}.azurecontainer.io:8000"
    ./scripts/ccf_sandbox_wait.sh

    # Clean the workspace and pull in from the Azure container
    rm -rf ${WORKSPACE}

    until [ -e "$WORKSPACE/sandbox_common/service_cert.pem" ] && \
          [ -e "$WORKSPACE/sandbox_common/member0_cert.pem" ] && \
          [ -e "$WORKSPACE/sandbox_common/member0_privk.pem" ]; do
        wget -nv -r -np -nH --cut-dirs=0 -P ${WORKSPACE} http://$DEPLOYMENT_NAME.$LOCATION.azurecontainer.io:8001
    done
else
    echo "DEPLOYMENT_ENV should be local or cloud, not ${DEPLOYMENT_ENV}"
    exit 1

fi

sudo chown $USER:$USER -R $WORKSPACE