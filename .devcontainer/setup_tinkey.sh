#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

export TINKEY_VERSION=${TINKEY_VERSION:-'tinkey-1.10.1'}
curl -O https://storage.googleapis.com/tinkey/$TINKEY_VERSION.tar.gz && \
    tar -xzvf $TINKEY_VERSION.tar.gz && \
    cp tinkey tinkey_deploy.jar /usr/bin/
