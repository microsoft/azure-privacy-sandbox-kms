SHELL := /bin/bash
WORKSPACE ?= ${PWD}/workspace
KMS_URL ?= https://127.0.0.1:8000
IMAGE_TAG ?= latest

DEPLOYMENT_ENV := $(if $(shell echo $(KMS_URL) | grep -E '127.0.0.1|localhost'),local,cloud)

.PHONY: help
.DEFAULT_GOAL := help

help: ## 💬 This help message :)
	@grep -E '[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# Manage Infra -----------------------------------------------------------------

ccf-sandbox-up:
	@WORKSPACE=${WORKSPACE} \
	DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
	IMAGE_TAG=${IMAGE_TAG} \
		./scripts/ccf-sandbox-up.sh

ccf-sandbox-down:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/ccf-sandbox-down.sh

ccf-sandbox-attach:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/ccf-sandbox-attach.sh

ccf-sandbox-logs:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/ccf-sandbox-logs.sh

jwt-issuer-up:
	@WORKSPACE=${WORKSPACE} \
	DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
	IMAGE_TAG=${IMAGE_TAG} \
		./scripts/jwt-issuer-up.sh

jwt-issuer-down:
	@DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/jwt-issuer-down.sh

jwt-issuer-trust:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
	DEPLOYMENT_ENV=${DEPLOYMENT_ENV} \
		./scripts/jwt-issuer-trust.sh

# Manage KMS -------------------------------------------------------------------

js-app-set:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
		./scripts/js-app-set.sh

constitution-set:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
	CONSTITUTION_PATH=$(constitution) \
		./scripts/constitution-set.sh

release-policy-set:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
	RELEASE_POLICY_PROPOSAL=$(release-policy-proposal) \
		./scripts/release-policy-set.sh

vote:
	@echo "TODO"

# Endpoints --------------------------------------------------------------------

heartbeat:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
		./scripts/endpoint_heartbeat.sh

refresh:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
		./scripts/endpoint_refresh.sh

listpubkeys:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
		./scripts/endpoint_listpubkeys.sh

pubkey:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
	KID=$(kid) \
	FMT=$(fmt) \
		./scripts/endpoint_pubkey.sh

keyReleasePolicy:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
		./scripts/endpoint_keyReleasePolicy.sh

key:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
	KID=$(kid) \
	FMT=$(fmt) \
		./scripts/endpoint_key.sh

unwrapKey:
	@WORKSPACE=${WORKSPACE} \
	KMS_URL=${KMS_URL} \
	KID=$(kid) \
	FMT=$(fmt) \
	WRAPPED_KID=$(wrapped-kid) \
		./scripts/endpoint_unwrapKey.sh

# Tests ------------------------------------------------------------------------

test-lint:
test-unit:
test-system:
	@pytest tests/system

test-all: test-lint test-unit test-system
