#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-sandbox-local-nodes-raw() {
    curl -s $KMS_URL/node/network/nodes \
        --cacert $KMS_SERVICE_CERT_PATH
}

ccf-sandbox-local-nodes() {
    ccf-sandbox-local-nodes-raw \
        | jq '{nodes: [.nodes[] | select(.status == "Trusted") | .rpc_interfaces.primary_rpc_interface.published_address]}'
}

ccf-sandbox-local-node() {
    curl -s $KMS_URL/node/network/nodes/$1 \
        --cacert "$KMS_SERVICE_CERT_PATH"
}

ccf-sandbox-local-node-count() {
    ccf-sandbox-local-nodes-raw | jq '.nodes | map(select(.status == "Trusted")) | length'
}

ccf-sandbox-local-pending-nodes() {
    curl -s $KMS_URL/node/network/nodes \
        --cacert $KMS_SERVICE_CERT_PATH \
        | jq -r '.nodes[] | select(.status == "Pending") | .node_id' | tr -d '"'
}

ccf-sandbox-local-node-delete() {
    curl -X DELETE $KMS_URL/node/network/nodes/$1 \
        --cacert $KMS_SERVICE_CERT_PATH
}

ccf-sandbox-local-scale-nodes() {

    REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../../..")"
    source $REPO_ROOT/scripts/ccf/propose.sh

    node_count=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--node-count)
                node_count="$2"
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1"
                return 1
                ;;
        esac
    done

    if [ -z $node_count ]; then
        read -p "Enter node count to scale to: " node_count
    fi

    current_node_count=$(ccf-sandbox-local-node-count)
    node_count_difference=$((node_count - current_node_count))

    docker compose \
        -f $REPO_ROOT/services/docker-compose.yml up -d \
            --scale ccf-sandbox-joiner=$((node_count - 1))

    if [ "$node_count_difference" -gt 0 ]; then
        until [ "$(ccf-sandbox-local-pending-nodes | wc -l)" -eq "$node_count_difference" ]; do
            sleep 1
        done

        for node_id in $(ccf-sandbox-local-pending-nodes); do
            proposal_file="$WORKSPACE/proposals/trust_${node_id}.json"
            NODE_ID=$node_id \
            VALID_FROM=$(date -u +"%y%m%d%H%M%SZ") \
                envsubst < "$REPO_ROOT/governance/proposals/transition_node_to_trusted.json" \
                    | jq > "$proposal_file"
            ccf-propose "$proposal_file"
        done
    elif [ "$node_count_difference" -lt 0 ]; then
        for node_url in $(ccf-sandbox-local-nodes | jq -r '.nodes[]'); do
            response=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$node_url/node/network")
            if [ "$response" -ne 200 ]; then
                node_json=$(ccf-sandbox-local-nodes-raw | jq --arg url "${node_url}" '.nodes[] | select(.rpc_interfaces.primary_rpc_interface.published_address == $url)')
                if [ "$(echo "$node_json" | jq -r '.status')" = "Trusted" ]; then
                    node_id=$(echo "$node_json" | jq -r '.node_id')
                    proposal_file="$WORKSPACE/proposals/remove_${node_id}.json"
                    NODE_ID=$node_id \
                        envsubst < "$REPO_ROOT/governance/proposals/remove_node.json" \
                            | jq > "$proposal_file"
                    ccf-propose "$proposal_file"
                fi
            fi
        done
    fi
}

ccf-sandbox-local-scale-nodes "$@"
ccf-sandbox-local-nodes
