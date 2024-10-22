#!/bin/bash

KMS_URL="${KMS_URL:-https://127.0.0.1:8000}"
response_code=000
echo "Waiting for CCF to start at ${KMS_URL}..."
while ! [[ $response_code -eq 400 || $response_code -eq 200 ]]; do
    sleep 1
    response_code=$(curl $KMS_URL/node/network -k --cert ${KEYS_DIR}/member0_cert.pem --key ${KEYS_DIR}/member0_privk.pem -s -o /dev/null -w "%{http_code}")
done
echo "CCF started"
