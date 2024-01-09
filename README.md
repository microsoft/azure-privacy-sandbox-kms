# Disclamer
This version can only be used for testing and not for production.

E.g. we dump keys in logs to facilitate testing and the solution has not gone through the necessary security evaluation, needed for production.

# Guidance

See [TypeScript Application](https://microsoft.github.io/CCF/main/build_apps/js_app_ts.html#typescript-application), [ccf-app-samples
/data-reconciliation-app](https://github.com/microsoft/ccf-app-samples/tree/main/data-reconciliation-app)

# Shortcuts
Key endpoints are unauthenticated for testing

# Setup local test environment

```bash
npm install
```

If you want to test KMS manually, you need [tinkey](https://developers.google.com/tink/install-tinkey) to see the content of tink keyset.
```bash
TINKEY_VERSION=tinkey-1.10.1
curl -O https://storage.googleapis.com/tinkey/$TINKEY_VERSION.tar.gz
tar -xzvf $TINKEY_VERSION.tar.gz
sudo cp tinkey /usr/bin/
sudo cp tinkey_deploy.jar /usr/bin/
sudo rm tinkey tinkey_deploy.jar tinkey.bat $TINKEY_VERSION.tar.gz

# Tinkey uses java
sudo apt install default-jre -y

tinkey help
```

# Setup mCCF test environment
The script can be edited to fit the local directories such KEYS_DIR.
Also the CCF_NAME can be edited to match the name of the mCCF service.
```
. ./scripts/setup_mCCF.sh
```

# Build/run local demo
## Getting started

This demo can work against the Sandbox or CCF running in a docker image with very little ceremony. As long as you have a terminal in the `kms` path, you can run `make demo` to run in the Sandbox, or `make demo-docker` to run in a virtual enclave inside docker.

## Part 1: Startup

Start the demo and e22 tests by running `make demo` in the `kms` path.

This part of the demo has started the network and deployed the app. The network is running with 3 members and 1 user, and the app is deployed with the constitution defined [here](../governance/constitution/), which means that all members have equal votes on decisions, and a majority of approval votes is required to advance proposals. All members have been activated.

```bash
▶️ Starting sandbox...
💤 Waiting for sandbox . . . (23318)
📂 Working directory (for certificates): ./workspace/sandbox_common
💤 Waiting for the app frontend...
Running TypeScript flow...
```
## Start only KMS in sandbox
```
make start-host
```

## Propose and vote new key release policy
### Add claims
```
export CCF_WORKSPACE=.
export KMS_URL=https://127.0.0.1:8000
export KEYS_DIR="$CCF_WORKSPACE"/workspace/sandbox_common
make propose-add-key-release-policy 
```
### Remove claims
```
make propose-rm-key-release-policy
```
### Script to setup policies and generate a key
```
export CCF_WORKSPACE=.
export KMS_URL=https://127.0.0.1:8000
export KEYS_DIR="$CCF_WORKSPACE"/workspace/sandbox_common
make setup
```
## Manual tests

```
# This is the path to CCF sandbox's working directory
export CCF_WORKSPACE=.
export KMS_URL=https://127.0.0.1:8000
# Generate a new key item
curl ${KMS_URL}/app/refresh -X POST --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" -i  -w '\n'

# Get the latest public key
curl ${KMS_URL}/app/pubkey --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'
# Get the latest public key in tink format
curl ${KMS_URL}/app/pubkey?fmt=tink --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'

# Get list of public keys
curl ${KMS_URL}/app/listpubkeys --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'

# Get the latest private key (JWT)
wrapped_resp=$(curl $KMS_URL/app/key -X POST --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" -d '@test/attestation-samples/snp.json'  | jq)
echo $wrapped_resp
kid=$(echo $wrapped_resp | jq '.wrapperKid' -r)
echo $kid
wrapped=$(echo $wrapped_resp | jq '.wrappedKeyContents' -r)
echo $wrapped

# Unwrap key with attestation (JWT)
curl $KMS_URL/app/unwrapKey -X POST --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" -d "{\"wrapped\":\"$wrapped\", \"kid\":\"$kid\", \"attestation\":$(cat test/attestation-samples/snp.json)}" | jq

# Get the latest private key (Tink)
wrapped_resp=$(curl $KMS_URL/app/key?fmt=tink -X POST --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" -d '@test/attestation-samples/snp.json'  | jq)
echo $wrapped_resp
key=$(echo $wrapped_resp | jq '.keys[0]')
# It has a format of "azu-kms://<kid>" like "azu-kms://tGe-cVHzNyim2Z0PzHO4y0ClXCa5J6x-bh7GmGJTr3c".
key_encryption_key_uri=$(echo $key | jq '.keyData[0].keyEncryptionKeyUri' -r)
kid=$(echo $key_encryption_key_uri | awk -F/ '{print $NF}')
echo $kid
keyMaterial=$(echo $key | jq '.keyData[0].keyMaterial' -r)
wrapped=$(echo $keyMaterial | jq '.encryptedKeyset' -r)
echo $wrapped

# Unwrap key with attestation (Tink)
curl $KMS_URL/app/unwrapKey?fmt=tink -X POST --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" -d "{\"wrapped\":\"$wrapped\", \"kid\":\"$kid\", \"attestation\":$(cat test/attestation-samples/snp.json)}" | tinkey convert-keyset --in-format binary

# Get key release policy
curl $KMS_URL/app/key_release_policy --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" | jq

# Get receipt
curl $KMS_URL/receipt?transaction_id=2.19 --cacert ${CCF_WORKSPACE}/workspace/sandbox_common/service_cert.pem --cert ${CCF_WORKSPACE}/workspace/sandbox_common/user0_cert.pem --key ${CCF_WORKSPACE}/workspace/sandbox_common/user0_privk.pem -H "Content-Type: application/json" -i  -w '\n'
```

# Managed CCF

## Generate member keys

```
export KEYS_DIR=vol
cd $KEYS_DIR
keygenerator.sh --name member0
```

## Retrieve service identity certificate

```
export CCF_NAME=acceu-bingads-500dev10
export identityurl=https://identity.confidential-ledger.core.azure.com/ledgerIdentity/${CCF_NAME}
curl $identityurl | jq ' .ledgerTlsCertificate' | xargs echo -e > service_cert.pem
```

## Activate member 0

You might need pip3 to install ccf:

```
sudo apt-get update
sudo apt-get install python3-pip -y
pip install ccf
```

```
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
curl $KMS_URL/gov/ack/update_state_digest -X POST --cacert service_cert.pem --key member0_privk.pem --cert member0_cert.pem --silent > request.json

ccf_cose_sign1 --content request.json --signing-cert member0_cert.pem --signing-key member0_privk.pem --ccf-gov-msg-type ack --ccf-gov-msg-created_at `date -Is`|curl --cacert service_cert.pem $KMS_URL/gov/ack -H 'Content-Type: application/cose' --data-binary @-

curl $KMS_URL/gov/members --cacert service_cert.pem | jq
```
## Set custom constitution
```
./scripts/submit_constitution.sh --network-url https://${CCF_NAME}.confidential-ledger.azure.com --certificate-dir  ./vol --custom-constitution ./governance/constitution/kms_actions.js --member-count 1
```
## Deploy

```
make deploy
```

## Add user

```
user0_id=$(openssl x509 -in "user0_cert.pem" -noout -fingerprint -sha256 | cut -d "=" -f 2 | sed 's/://g' | awk '{print tolower($0)}')

proposalid=$( (ccf_cose_sign1 --content set_user0.json --signing-cert member0_cert.pem --signing-key member0_privk.pem --ccf-gov-msg-type proposal --ccf-gov-msg-created_at `date -Is` | curl $KMS_URL/gov/proposals -H "Content-Type: application/cose" --data-binary @- --cacert service_cert.pem | jq -r '.proposal_id') )

ccf_cose_sign1 --content ../../governance/vote/vote_accept.json --signing-cert member0_cert.pem --signing-key member0_privk.pem --ccf-gov-msg-type ballot --ccf-gov-msg-created_at `date -Is` --ccf-gov-msg-proposal_id $proposalid | curl $KMS_URL/gov/proposals/$proposalid/ballots -H "Content-Type: application/cose" --data-binary @- --cacert service_cert.pem

```
## Propose and vote new key release policy
### Add claims
```
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
export KEYS_DIR=vol
make propose-add-key-release-policy 
```
### Remove claims
```
make propose-rm-key-release-policy
```

## Test
```
export KEYS_DIR=./vol
export CCF_NAME=acceu-bingads-500dev10
export KMS_URL=https://${CCF_NAME}.confidential-ledger.azure.com
# Set key release policy
make propose-add-key-release-policy

curl $KMS_URL/app/refresh -X POST --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'

# Get list of public keys
curl ${KMS_URL}/app/listpubkeys  --cacert $KEYS_DIR/service_cert.pem  -H "Content-Type: application/json" -i  -w '\n'


curl $KMS_URL/app/pubkey --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'
# Get the latest public key in tink format
curl $KMS_URL/app/pubkey?fmt=tink --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'

curl $KMS_URL/app/key -X POST --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" -i  -d '@test/attestation-samples/snp.json'  -w '\n'

# Get governance
curl $KMS_URL/gov/kv/constitution --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'

# Get proposals
curl $KMS_URL/gov/proposals --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" -i  -w '\n'

# Get key release policy
curl $KMS_URL/app/key_release_policy --cacert $KEYS_DIR/service_cert.pem --cert $KEYS_DIR/member0_cert.pem --key $KEYS_DIR/member0_privk.pem -H "Content-Type: application/json" | jq

```
## Kusto logs
https://dataexplorer.azure.com/clusters/confidentialledgerprod.centralus/databases/confidentialledger
The application logs are in the TracesUserApp table and the CCF node logs are in the TracesCcfNode table. 
```
TracesUserApp
| where ['time'] > ago(4d)
| where properties has "acceu-bingads-500dev10"
| order by TIMESTAMP desc
 
 TracesCcfNode
| where ['time'] > ago(4d)
| where NamespaceName == "acceu-bingads-500dev10"
| order by TIMESTAMP desc
```
# Privacy Sandbox

## Signing 
Curve ECC_NIST_P256
Algorithm ECDSA_SHA_256

## Symmetric encryption AEAD 
AES128_GCM
## HPKE
DHKEM_X25519_HKDF_SHA256_HKDF_SHA256_AES_256_GCM 

# Other
## Debugging unit tests
Open the command palette and start Debug: JavaScript Debug Terminal.
Run tests in that terminal in a Watch mode using npm test --watch

# Generating protobuf files
```
cd src/endpoint/proto
```
## Failed experiment protobuf-compiler/out1
CCF could not load the generated files even if they were turned into a package
```
sudo apt install  -y protobuf-compiler
npm install -g ts-protoc-gen
which protoc-gen-ts
./compile_proto.sh -i . -o ./out1
```

## Maintain protobuf

We are using [protobuf-es](https://github.com/bufbuild/protobuf-es) to use protobuf.
When you want to update protobuf generated code run `npm run build-proto`.
