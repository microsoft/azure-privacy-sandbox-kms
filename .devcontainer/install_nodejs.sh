#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

curl -fsSL https://deb.nodesource.com/setup_current.x | bash - && \
    apt-get install -y nodejs && \
    pip install --upgrade pip setuptools

# Install NPM
export NVM_DIR=${NVM_DIR:-'/root/.nvm'}
NODE_VERSION=v22.9.0
mkdir -p $NVM_DIR
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm use $NODE_VERSION

echo "Install rollup, this is a temporary workaround to a bug around symlinking"
npm install -g rollup@4.21.1
