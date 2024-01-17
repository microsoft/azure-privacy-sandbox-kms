SHELL := /bin/bash
CCF_NAME := "acceu-bingads-500dev10"
PYTHON_VENV := .venv_ccf_sandbox
CCF_WORKSPACE ?= .
WORKSPACE ?= ${CCF_WORKSPACE}/workspace
KMS_URL ?= https://127.0.0.1:8000
KEYS_DIR ?= ${CCF_WORKSPACE}/workspace/sandbox_common

ifeq ($(INSTALL),local)
    CCFSB=../../CCF/tests/sandbox
else
    CCFSB=/opt/ccf_virtual/bin
endif

.PHONY: help
.DEFAULT_GOAL := help

help: ## 💬 This help message :)
	@grep -E '[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

build: ## 🔨 Build the Application
	@echo -e "\e[34m$@\e[0m" || true; 
	./scripts/set_python_env.sh
	npm run build

# Start hosting the application using `sandbox.sh` and enable custom JWT authentication
start-host: build  ## 🏃 Start the CCF network using Sandbox.sh
	@echo -e "\e[34m$@\e[0m" || true
	$(CCFSB)/sandbox.sh --js-app-bundle ./dist/ --initial-member-count 3 --initial-user-count 1 --constitution ./governance/constitution/kms_actions.js -v

setup: ## Setup policies and generate a key
	@echo -e "\e[34m$@\e[0m" || true
	WORKSPACE=${CCF_WORKSPACE}/workspace; \
	export WORKSPACE; \
	./scripts/kms_create_key.sh --network-url "${KMS_URL}"  --certificate_dir "${KEYS_DIR}"
		
demo: build ## 🎬 Demo the KMS Application in the Sandbox
	@echo -e "\e[34m$@\e[0m" || true
	@. ./scripts/test_sandbox.sh --nodeAddress 127.0.0.1:8000 --certificate_dir ${CCF_WORKSPACE}/workspace/sandbox_common --constitution ./governance/constitution/kms_actions.js

# Propose a new key release policy
propose-add-key-release-policy: ## 🚀 Deploy the add claim key release policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	@. ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-release-policy-add.json --certificate_dir "${KEYS_DIR}" --member-count 2

propose-rm-key-release-policy: ## 🚀 Deploy the remove claim key release policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	$(call check_defined, KMS_URL)
	@./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-release-policy-remove.json --certificate_dir "${KEYS_DIR}"

# The following are here in case you forget to change directory!
deploy: build ## 🚀 Deploy Managed CCF or local
	@echo -e "\e[34m$@\e[0m" || true
	@./scripts/deploy.sh --network-url "${KMS_URL}"  --certificate_dir "${KEYS_DIR}"

lint: ## 🔍 Lint the code base (but don't fix)
	@echo -e "\e[34m$@\e[0m" || true
	@./scripts/lint.sh
# Keep this at the bottom.
clean: ## 🧹 Clean the working folders created during build/demo
	@rm -rf ${CCF_WORKSPACE}/.venv_ccf_sandbox
	@rm -rf ${CCF_WORKSPACE}/workspace
	@rm -rf dist