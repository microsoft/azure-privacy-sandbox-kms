#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

ccf-sandbox-local-nodes() {
    curl -s $KMS_URL/node/network/nodes \
        --cacert $KMS_SERVICE_CERT_PATH | jq '.nodes'
}

ccf-sandbox-local-node() {
    curl -s $KMS_URL/node/network/nodes/$1 \
        --cacert $KMS_SERVICE_CERT_PATH | jq
}

status-is() {
    jq --arg status "$1" '[.[] | select(.status == $status)]'
}

node-id() {
    jq 'if type == "array" then map(.node_id) else .node_id end'
}

node-url() {
    jq 'if type == "array" then map(.rpc_interfaces.primary_rpc_interface.published_address) else .rpc_interfaces.primary_rpc_interface.published_address end'
}

self() {
    jq -c '.[]' | while read -r node; do
        url=$(echo $node | node-url | tr -d '"')
        curl -s https://$url/node/network/nodes/self \
            --cacert $KMS_SERVICE_CERT_PATH
    done | jq -s '.'
}

container-state-is() {
    jq -c '.[]' | while read -r node; do
        url=$(echo $node | node-url | tr -d '"')
        resp=$(curl -s https://$url/node/network/nodes/self \
            --cacert $KMS_SERVICE_CERT_PATH \
            -o /dev/null -w "%{http_code}")
        if [[ $1 = "Running" ]] && [ "$resp" -eq 200 ]; then
            echo "$node"
        elif [[ $1 = "Stopped" ]] && [ "$resp" -ne 200 ]; then
            echo "$node"
        fi
    done | jq -s '.'
}

running() {
    status-is "Trusted" | container-state-is "Running"
}

count() {
    jq 'length'
}

iterate() {
    jq -c '.[]' | tr -d '"'
}

open-proposals() {
    curl -s $KMS_URL/gov/members/proposals | jq -r '.[].proposalId'
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

    current_node_count=$(ccf-sandbox-local-nodes | running | count)
    node_count_difference=$((node_count - current_node_count))

    # Scale the CCF node containers
    docker compose \
        -f $REPO_ROOT/services/docker-compose.yml \
        up ccf-sandbox-joiner \
            --scale ccf-sandbox-joiner=$((node_count - 1)) \
            --wait

    # Propose adding any new nodes
    ccf-sandbox-local-nodes | status-is "Pending" | node-id | iterate \
        | while read -r node_id; do
        proposal_file="$WORKSPACE/proposals/trust_${node_id}.json"
        NODE_ID=$node_id \
        VALID_FROM=$(date -u +"%y%m%d%H%M%SZ") \
            envsubst < "$REPO_ROOT/governance/proposals/transition_node_to_trusted.json" \
                | jq > "$proposal_file"
        ccf-propose "$proposal_file"
    done

    # Propose removing any stopped nodes
    if [ "$node_count_difference" -lt 0 ]; then
        ccf-sandbox-local-nodes | status-is "Trusted" | container-state-is "Stopped" \
            | node-id | iterate | while read -r node_id; do
            proposal_file="$WORKSPACE/proposals/remove_${node_id}.json"
            NODE_ID=$node_id \
                envsubst < "$REPO_ROOT/governance/proposals/remove_node.json" \
                    | jq > "$proposal_file"
            ccf-propose "$proposal_file"
        done
    fi

    # Wait until the node count matches the desired value
    echo "Waiting for expected nodes to be available:" >&2
    echo "If the networks constitution requires proposals are voted for, vote for outstanding proposals to trust nodes" >&2
    current_proposals=""
    while [ "$(ccf-sandbox-local-nodes | running | count)" -ne "$node_count" ]; do
        sleep 1
        next_proposals=$(open-proposals)
        if [ "$current_proposals" != "$next_proposals" ]; then
            current_proposals=$next_proposals
            echo "Current proposals: $current_proposals"
        fi
    done
}

ccf-sandbox-local-scale-nodes "$@" && \
ccf-sandbox-local-nodes | running | node-url | jq '{nodes: .}'
