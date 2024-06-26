#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

curl -fsSL https://deb.nodesource.com/setup_current.x | bash - && \
    apt-get install -y nodejs && \
    pip install --upgrade pip setuptools

# Install NPM
export NVM_DIR=${NVM_DIR:-'/root/.nvm'}
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install node \
    && nvm use node

. $NVM_DIR/nvm.sh \
    && npm install -g npm@latest
