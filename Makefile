SHELL := /bin/bash
CCF_NAME ?= "500dev10"
PYTHON_VENV := .venv_ccf_sandbox
KMS_WORKSPACE ?= ${PWD}/workspace
KMS_URL ?= https://127.0.0.1:8000
KEYS_DIR ?= ${KMS_WORKSPACE}/sandbox_common
RUN_BACK ?= true
CCF_PLATFORM ?= virtual
JWT_ISSUER_WORKSPACE ?= ${PWD}/jwt_issuer_workspace

DEPLOYMENT_ENV ?= $(if $(shell echo $(KMS_URL) | grep -E '127.0.0.1|localhost'),local,cloud)

ifndef MEMBER_COUNT
ifeq ($(findstring https://127.0.0.1,$(KMS_URL)),https://127.0.0.1)
	MEMBER_COUNT := 3
else
	MEMBER_COUNT := 1
endif
endif

CCF_SANDBOX_EXTRA_ARGS ?=

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
	npm install
	npm run build

setup: ## Setup proposals and generate an initial key
	@echo -e "\e[34m$@\e[0m" || true
	CCF_PLATFORM=${CCF_PLATFORM} ./scripts/kms_setup.sh --network-url "${KMS_URL}"  --certificate_dir "${KEYS_DIR}"

stop-host:  ## 🏃 Stop the host
	@echo -e "\e[34m$@\e[0m" || true
	source ./scripts/ccf/sandbox_local/down.sh

stop-idp:  ## 🏃 Stop the idp
	@echo -e "\e[34m$@\e[0m" || true
	source ./scripts/jwt_issuer/down.sh

stop-all: stop-host stop-idp # Stop all services
	@echo -e "\e[34m$@\e[0m" || true

# idp commands to issue JWT
start-idp:  ## 🏃 Start the idp for testing jwt
	@echo -e "\e[34m$@\e[0m" || true
	source ./scripts/jwt_issuer/up.sh --build

# Start hosting the application using `sandbox.sh` and enable custom JWT authentication
start-host: stop-host  ## 🏃 Start the CCF network using Sandbox.sh
	@echo -e "\e[34m$@\e[0m" || true
	MEMBER_COUNT=${MEMBER_COUNT} source ./scripts/ccf/sandbox_local/up.sh --build && \
	source ./scripts/kms/js_app_set.sh && \
	source ./scripts/kms/constitution_set.sh \
		--resolve ./governance/constitution/resolve/auto_accept.js \
		--actions ./governance/constitution/actions/kms.js

start-host-idp: stop-host stop-idp build ## 🏃 Start the CCF network && idp using Sandbox.sh
	@echo -e "\e[34m$@\e[0m" || true
	@echo "Executing: $(COMMAND)"
	MEMBER_COUNT=${MEMBER_COUNT} source ./scripts/ccf/sandbox_local/up.sh --build && \
	source ./scripts/jwt_issuer/up.sh --build && \
	source ./scripts/kms/constitution_set.sh \
		--resolve ./governance/constitution/resolve/auto_accept.js \
		--actions ./governance/constitution/actions/kms.js && \
	source scripts/kms/jwt_issuer_trust.sh && \
	source scripts/kms/js_app_set.sh

demo: stop-all start-host-idp ## 🎬 Demo the KMS Application in the Sandbox
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/test_sandbox.sh --nodeAddress 127.0.0.1:8000 --certificate_dir ${KMS_WORKSPACE}/sandbox_common --constitution ./governance/constitution/actions/kms.js

# Propose the JWT validation policy
propose-jwt-demo-validation-policy: ## 🚀 Deploy the JWT validation policy
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/jwt/set_jwt_demo_validation_policy_proposal.json --certificate_dir "${KEYS_DIR}" --member-count ${MEMBER_COUNT}

# Propose a new idp
propose-jwt-ms-validation-policy: ## 🚀 Propose the AAD as idp
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/jwt/set_jwt_ms_validation_policy_proposal.json --certificate_dir "${KEYS_DIR}" --member-count ${MEMBER_COUNT}

# Propose a new settings policy
propose-settings-policy: ## 🚀 Deploy the settings policy
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/settings-policy.json --certificate_dir "${KEYS_DIR}" --member-count ${MEMBER_COUNT}

# Propose a new key release policy
propose-add-key-release-policy: ## 🚀 Deploy the add claim key release policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-release-policy-add.json --certificate_dir "${KEYS_DIR}" --member-count ${MEMBER_COUNT}

propose-rm-key-release-policy: ## 🚀 Deploy the remove claim key release policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	$(call check_defined, KMS_URL)
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-release-policy-remove.json --certificate_dir "${KEYS_DIR}"

propose-key-rotation-policy: ## 🚀 Deploy the key rotation policy to the sandbox or mCCF
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_proposal.sh --network-url "${KMS_URL}" --proposal-file ./governance/policies/key-rotation-policy.json --certificate_dir "${KEYS_DIR}" --member-count ${MEMBER_COUNT}

refresh-key: ## 🚀 Refresh a key on the instance
	@echo -e "\e[34m$@\e[0m" || true
	$(call check_defined, KMS_URL)
	@CCF_PLATFORM=${CCF_PLATFORM};curl "${KMS_URL}"/app/refresh -X POST --cacert "${KEYS_DIR}"/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'

set-constitution: start-host-idp ## Set new custom constitution
	@echo -e "\e[34m$@\e[0m" || true
	$(call check_defined, KMS_URL)
	$(call check_defined, KEYS_DIR)
	# Copy the files to the KEYS_DIR to construct the full constitution
	if [ "${KMS_WORKSPACE}/sandbox_common" != "${KEYS_DIR}" ]; then \
		echo "Copying files for constitution"; \
		@sleep 5; \
		cp -r ${KMS_WORKSPACE}/sandbox_common/*.js ${KEYS_DIR}; \
	fi
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/submit_constitution.sh --network-url "${KMS_URL}" --certificate-dir "${KEYS_DIR}" --custom-constitution ./governance/constitution/actions/kms.js --member-count ${MEMBER_COUNT}

get-service-cert: # Get the mCCF service cert
	@echo -e "\e[34m$@\e[0m" || true
	$(call check_defined, IDENTITY_URL)
	curl ${IDENTITY_URL} | jq ' .ledgerTlsCertificate' | xargs echo -e > ${KEYS_DIR}/service_cert.pem

setup-mCCF: set-constitution deploy propose-add-key-release-policy propose-jwt-ms-validation-policy refresh-key  ## 🚀 Prepare an mCCF instance
	@echo -e "\e[34m$@\e[0m" || true

# The following are here in case you forget to change directory!
deploy: build ## 🚀 Deploy Managed CCF or local
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/deploy.sh --network-url "${KMS_URL}"  --certificate_dir "${KEYS_DIR}"

lint: ## 🔍 Lint the code base (but don't fix)
	@echo -e "\e[34m$@\e[0m" || true
	@CCF_PLATFORM=${CCF_PLATFORM} ./scripts/lint.sh --fix

# Manage Infra -----------------------------------------------------------------

ccf-sandbox-up:
	@WORKSPACE=${KMS_WORKSPACE} \
	DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
	IMAGE_TAG=${IMAGE_TAG} \
	DEPLOYMENT_NAME=$(deployment-name) \
		./scripts/ccf-sandbox-up.sh

ccf-sandbox-down:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
	DEPLOYMENT_NAME=$(deployment-name) \
		./scripts/ccf-sandbox-down.sh

ccf-sandbox-attach:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/ccf-sandbox-attach.sh

ccf-sandbox-logs:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/ccf-sandbox-logs.sh

jwt-issuer-up:
	@WORKSPACE=${KMS_WORKSPACE} \
	DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
	IMAGE_TAG=${IMAGE_TAG} \
		./scripts/jwt_issuer/up.sh

jwt-issuer-down:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/jwt_issuer/down.sh

jwt-issuer-trust:
	@WORKSPACE=${KMS_WORKSPACE} \
	KMS_URL=${KMS_URL} \
	DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/kms/jwt_issuer_trust.sh

# Manage KMS -------------------------------------------------------------------

js-app-set:
	@WORKSPACE=${KMS_WORKSPACE} \
	KMS_URL=${KMS_URL} \
		./scripts/kms/js_app_set.sh

constitution-set:
	@WORKSPACE=${KMS_WORKSPACE} \
	KMS_URL=${KMS_URL} \
	./scripts/kms/constitution_set.sh \
		--resolve ./governance/constitution/resolve/auto_accept.js \
		--actions ./governance/constitution/actions/kms.js

release-policy-set:
	@WORKSPACE=${KMS_WORKSPACE} \
	KMS_URL=${KMS_URL} \
	RELEASE_POLICY_PROPOSAL=$(release-policy-proposal) \
		./scripts/kms/release_policy_set.sh

settings-policy-set:
	@WORKSPACE=${KMS_WORKSPACE} \
	KMS_URL=${KMS_URL} \
	SETTINGS_POLICY_PROPOSAL=$(settings-policy-proposal) \
		./scripts/kms/settings_policy_set.sh

test-unit:
	npm run test

test-system:
	@pytest -s test/system-test/$(filter-out $@,$(MAKECMDGOALS))

# Keep this at the bottom.
clean: ## 🧹 Clean the working folders created during build/demo
	@rm -rf ${PYTHON_VENV}
	@rm -rf ${KMS_WORKSPACE}
	@rm -rf dist
