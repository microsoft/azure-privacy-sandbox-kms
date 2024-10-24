#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

set -ex
PYTHON_VENV=.venv_ccf_sandbox

if [ ! -d "$PYTHON_VENV" ]; then
	echo "Creating Python virtual environment..."
	python3 -m venv $PYTHON_VENV
	echo "Activating virtual environment and installing dependencies..."
	source $PYTHON_VENV/bin/activate
	pip install -U -r ./requirements.txt
else
	echo "Activating existing virtual environment..."
	source $PYTHON_VENV/bin/activate
fi
