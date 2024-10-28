#!/bin/bash

set -e

endpoint_retry() {
    until [ "$($1 -s -o /dev/null -w "%{http_code}")" -ne 202 ]; do
        sleep 1
    done
    $1 | jq
}