#!/bin/bash

set -e

gh release download 1.0.7 -R microsoft/confidential-aci-testing --clobber
python3 -m pip install c_aci_testing*.tar.gz
rm c_aci_testing*.tar.gz