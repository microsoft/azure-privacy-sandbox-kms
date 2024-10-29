#!/bin/bash

set -e

TOOLS_DIR="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"

set -x

pip install -q -r $TOOLS_DIR/../../requirements.txt
npm install --silent --prefix $TOOLS_DIR/../../
$TOOLS_DIR/install-c-aci-testing.sh > /dev/null
