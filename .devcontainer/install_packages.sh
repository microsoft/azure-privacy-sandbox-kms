#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

apt-get update && apt-get install -y \
    python3-pip \
    openssh-client \
    make \
    libuv1 \
    jq \
    lsof \
    sudo \
    tar \
    default-jre
