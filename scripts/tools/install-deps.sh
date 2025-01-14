#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

set -x

date
pip install -q -r $REPO_ROOT/requirements.txt -v
date
npm install --silent --prefix $REPO_ROOT/ --dd
date
$REPO_ROOT/scripts/tools/install-c-aci-testing.sh > /dev/null
