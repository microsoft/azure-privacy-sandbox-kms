SHELL := /bin/bash
CCF_NAME := "acceu-bingads-500dev10"
PYTHON_VENV := .venv_ccf_sandbox
KMS_WORKSPACE ?= ${PWD}/workspace
KMS_URL ?= https://127.0.0.1:8000
KEYS_DIR ?= ${KMS_WORKSPACE}/sandbox_common
RUN_BACK ?= true
CCF_PLATFORM ?= virtual

ifeq ($(INSTALL),local)
    CCFSB=../../CCF/tests/sandbox
else
    CCFSB=/opt/ccf_${CCF_PLATFORM}/bin
endif

.PHONY: help
.DEFAULT_GOAL := help

help: ## 💬 This help message :)
	@grep -E '[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

build: ## 🔨 Build the Application
	@echo -e "\e[34m$@\e[0m" || true; 
	./scripts/set_python_env.sh
	npm run build

setup: ## Setup proposals and generate an initial key
	@echo -e "\e[34m$@\e[0m" || true
	CCF_PLATFORM=${CCF_PLATFORM} ./scripts/kms_setup.sh --network-url "${KMS_URL}"  --certificate_dir "${KEYS_DIR}"

stop-host:  ## 🏃 Stop the host
	@echo -e "\e[34m$@\e[0m" || true
	sudo lsof -t -i :8000 | xargs -r sudo kill -9

stop-idp:  ## 🏃 Stop the idp
	@echo -e "\e[34m$@\e[0m" || true
	sudo lsof -t -i :3000 | xargs -r sudo kill -9
	
stop-all: stop-host stop-idp # Stop all services
	@echo -e "\e[34m$@\e[0m" || true
	
# idp commands to issue JWT
start-idp:  ## 🏃 Start the idp for testing jwt
	@echo -e "\e[34m$@\e[0m" || true
	mkdir -p ${KMS_WORKSPACE}
	cd test/utils/jwt && KMS_WORKSPACE=${KMS_WORKSPACE} nohup npm run start  &

# Start hosting the application using `sandbox.sh` and enable custom JWT authentication
start-host: stop-host build  ## 🏃 Start the CCF network using Sandbox.sh
	@echo -e "\e[34m$@\e[0m" || true
	$(CCFSB)/sandbox.sh --js-app-bundle ./dist/ --initial-member-count 3 --initial-user-count 1 --constitution ./governance/constitution/kms_actions.js  -v $(extra_args)

start-host-idp: stop-host stop-idp start-idp build ## 🏃 Start the CCF network && idp using Sandbox.sh
	@echo -e "\e[34m$@\e[0m" || true
	@echo "Executing: $(COMMAND)"
	if [ "$(RUN_BACK)" = "true" ]; then \
		 env -i PATH=${PATH} KMS_WORKSPACE=${KMS_WORKSPACE} $(CCFSB)/sandbox.sh --js-app-bundle ./dist/ --initial-member-count 3 --initial-user-count 1 --constitution ./governance/constitution/kms_actions.js --jwt-issuer ${KMS_WORKSPACE}/proposals/set_jwt_issuer_test_sandbox.json  -v $(extra_args) & \
	else \
		 env -i PATH=${PATH} KMS_WORKSPACE=${KMS_WORKSPACE} $(CCFSB)/sandbox.sh --js-app-bundle ./dist/ --initial-member-count 3 --initial-user-count 1 --constitution ./governance/constitution/kms_actions.js --jwt-issuer ${KMS_WORKSPACE}/proposals/set_jwt_issuer_test_sandbox.json  -v $(extra_args); \
	fi

demo: build ## 🎬 Demo the KMS Application in the Sandbox
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/test_sandbox.sh --nodeAddress 127.0.0.1:8000 --certificate_dir ${KMS_WORKSPACE}/sandbox_common --constitution ./governance/constitution/kms_actions.js

# Propose a new key release policy
propose-add-key-release-policy: ## 🚀 Deploy the add claim key release policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-release-policy-add.json --certificate_dir "${KEYS_DIR}" --member-count 2

propose-rm-key-release-policy: ## 🚀 Deploy the remove claim key release policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	$(call check_defined, KMS_URL)
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-release-policy-remove.json --certificate_dir "${KEYS_DIR}"

# Propose a new idp
propose-idp: ## 🚀 Propose the sample idp
	@echo -e "\e[34m$@\e[0m" || true
	@. CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ${KMS_WORKSPACE}/proposals/set_jwt_issuer_test_proposal.json --certificate_dir "${KEYS_DIR}" --member-count 2


# The following are here in case you forget to change directory!
deploy: build ## 🚀 Deploy Managed CCF or local
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/deploy.sh --network-url "${KMS_URL}"  --certificate_dir "${KEYS_DIR}"

lint: ## 🔍 Lint the code base (but don't fix)
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/lint.sh
	
# Keep this at the bottom.
clean: ## 🧹 Clean the working folders created during build/demo
	@rm -rf .venv_ccf_sandbox
	@rm -rf ${KMS_WORKSPACE}
	@rm -rf dist