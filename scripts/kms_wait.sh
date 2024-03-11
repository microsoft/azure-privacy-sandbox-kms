#!/bin/bash

KMS_URL="${KMS_URL:-https://127.0.0.1:8000}"
response_code=000
echo "Waiting for KMS to start..."
while ! [[ $response_code -eq 400 || $response_code -eq 200 ]]; do
    sleep 1
    response_code=$(curl $KMS_URL/app/listpubkeys -k -s -o /dev/null -w "%{http_code}")
done
echo "KMS started"