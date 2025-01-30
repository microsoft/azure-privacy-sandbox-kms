#!/bin/bash

set -e

REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"

set -x

$REPO_ROOT/.devcontainer/install_packages.sh > /dev/null
pip install -q -r $REPO_ROOT/requirements.txt
npm install --silent --prefix $REPO_ROOT/
$REPO_ROOT/scripts/tools/install-c-aci-testing.sh > /dev/null
