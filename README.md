# Transparent Key Management System (KMS) for Azure AI Confidential Inferencing
 
This repository contains the source code for a confidential and transparent key management system for [Azure AI Confidential Inferencing](https://techcommunity.microsoft.com/blog/azure-ai-services-blog/azure-ai-confidential-inferencing-preview/4248181). Azure AI Confidential Inferencing is a Model-as-a-Service that offers end-to-end verifiable privacy for prompts and completions, even from Microsoft. In confidential inferencing, inference runs in Trusted Execution Environments [TEEs](https://learn.microsoft.com/en-us/azure/confidential-computing/trusted-execution-environment) created using Azure Confidential GPU VMs. Prompts are encrypted using oblivious HTTP (OHTTP), ensuring that untrusted services between the client and the TEE (TLS termination, load balancing, DoS protection, authentication, billing) only see encrypted prompts and completions.
 
Clients of confidential inferencing obtain public HPKE keys to encrypt their inference request from the KMS. The KMS, which is implemted using [CCF](https://github.com/microsoft/CCF), ensures that private HPKE keys are securely generated, stored, periodically rotated, and released only to Azure Confidential GPU VMs hosting a transparent software stack. The release of private HPKE keys is governed by key release policies. When a Confidential GPU VM requests a private HPKE key, it presents an attestation token issued by MAA that includes measurements of its TPM PCRs. The KMS validates this attestation token against the key release policy and wraps the private HPKE key with a wrapping key generated and only accessible by the Confidential GPU VM. Key wrapping protects the private HPKE key in transit and ensures that only attested VMs that meet the key release policy can unwrap the private key.
 
The KMS permits service administrators to make changes to key release policies e.g., when the Trusted Computing Base (TCB) requires servicing. However, all changes to the key release policies are signed by administrators and will be recorded in a transparency ledger. External auditors will be able to obtain a copy of the ledger, independently verify the entire history of key release policies, and hold service administrators accountable. When clients request the current public key, the KMS also returns evidence (attestation and transparency receipts) that the key was generated within and managed by the KMS, for the current key release policy. Clients of the endpoint (e.g., the OHTTP proxy) can verify this evidence before using the key for encrypting prompts.


# Disclamer

This version of KMS can only be used for testing and not for production.

E.g. we dump keys in logs to facilitate testing and the solution has not gone through the necessary security evaluation, needed for production.

Because of integration testing we have not yet fully secured the endpoints. This is work to be done before production.

# Guidance

See [TypeScript Application](https://microsoft.github.io/CCF/main/build_apps/js_app_ts.html#typescript-application), [ccf-app-samples
/data-reconciliation-app](https://github.com/microsoft/ccf-app-samples/tree/main/data-reconciliation-app)

# Shortcuts

Key endpoints are unauthenticated for testing

# Setup local test environment

```bash
npm install
```
# Build/run local demo

## Getting started

This demo can work against the Sandbox or CCF running in a docker image with very little ceremony. As long as you have a terminal in the `kms` path, you can run `make demo` to run in the Sandbox or docker.

## Part 1: Startup

Start the demo and e22 tests by running `make demo` in the `kms` path.

This part of the demo has started the network and deployed the KMS app. The network is running with 3 members and 1 user, and the app is deployed with the constitution defined [here](../governance/constitution/), which means that all members have equal votes on decisions, and a majority of approval votes is required to advance proposals. All members have been activated.

```bash
export KMS_WORKSPACE=${PWD}/workspace
make demo
▶️ Starting sandbox...
💤 Waiting for sandbox . . . (23318)
📂 Working directory (for certificates): ./workspace/sandbox_common
💤 Waiting for the app frontend...
Running TypeScript flow...
```

## Start KMS and IDP in sandbox

```
export KMS_WORKSPACE=${PWD}/workspace
make start-host-idp

# Setup additional vars used in the manual tests
. ./scripts/setup_local.sh
```

## Propose and vote new key release policy

### Add claims

```
make propose-add-key-release-policy-maa
```

### Remove claims

```
make propose-rm-key-release-policy-maa
```

## Propose and vote new settings policy

change governance/policies/settings-policy.json and change make debug=false.
Use the following make command to change the settings.

```
make propose-settings-policy
```

### Script to setup policies and generate a key

```
make setup
```

## Manual tests

```
source scripts/setup_local.sh

# Heartbeat endpoint
curl ${KMS_URL}/app/heartbeat --cacert ${KEYS_DIR}/service_cert.pem  -H "Content-Type: application/json"  -w '\n' | jq

# Testing with auth: Use user certs
curl ${KMS_URL}/app/auth --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/user0_cert.pem --key ${KEYS_DIR}/user0_privk.pem -H "Content-Type: application/json" -w '\n' | jq

# Testing with auth: Use member certs
curl ${KMS_URL}/app/auth --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" -w '\n' | jq

# Testing with auth: Use JWT
curl ${KMS_URL}/app/auth --cacert ${KEYS_DIR}/service_cert.pem  -H "Content-Type: application/json" -H "Authorization:$AUTHORIZATION"  -w '\n' | jq

# Generate a new key item
curl ${KMS_URL}/app/refresh -X POST --cacert ${KEYS_DIR}/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'

# Get list of public keys
curl ${KMS_URL}/app/listpubkeys --cacert ${KEYS_DIR}/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'

# Get the latest private key (JWT)

# Get key release policy
curl $KMS_URL/app/keyReleasePolicy --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" | jq

# Get settings policy
curl $KMS_URL/app/settingsPolicy --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -H "Content-Type: application/json" | jq

# Get receipt
curl $KMS_URL/receipt?transaction_id=2.20 --cacert ${KEYS_DIR}/service_cert.pem --cert ${KEYS_DIR}/user0_cert.pem --key ${KEYS_DIR}/user0_privk.pem -H "Content-Type: application/json" -i  -w '\n'
```

## Run end to end system tests

```
pytest -s test/inference-system-test
```

### Test identity provier in seperate terminal

```
export AadEndpoint=http://localhost:3000/token
./scripts/generate_access_token.sh
```

# Contributing

To take administrator actions such as adding users as contributors, please refer to [engineering hub](https://eng.ms/docs/initiatives/open-source-at-microsoft/github/opensource/repos/jit)
