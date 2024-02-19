#!/bin/bash

timeout_seconds=300 # Timeout value in seconds
start_time=$(date +%s)

while true; do
    current_time=$(date +%s)
    elapsed_time=$((current_time - start_time))

    if [ $elapsed_time -ge $timeout_seconds ]; then
        echo "Timeout reached. Exiting..."
        exit 1
    fi

    status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metadata/identity/oauth2/token?api-version=2018-02-01)
    if [ $status_code -eq 200 ]; then
        exit 0
    else
        echo "Waiting for localhost:3000..."
        sleep 5
    fi
done