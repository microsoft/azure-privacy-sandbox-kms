import os
import subprocess
import pytest

from utils import get_node_info, nodes_scale, deploy_app_code


def test_nodes_scale_up(setup_kms):
    nodes_requested = 2

    # Scale the node number up
    result = nodes_scale(nodes_requested, get_logs=True)
    assert len(result["nodes"]) == nodes_requested

    # Check that each node is reachable and reports a unique identity
    node_ids = set()
    for node_url in result["nodes"]:
        status_code, node = get_node_info(node_url)
        assert status_code == 200
        assert node["status"] == "Trusted"
        node_ids.add(node["node_id"])
    assert len(node_ids) == nodes_requested


def test_nodes_scale_down(setup_kms):
    nodes_requested = 3

    # Scale the node number up
    result = nodes_scale(nodes_requested, get_logs=True)
    scaled_up_nodes = result["nodes"]
    assert len(result["nodes"]) == nodes_requested

    # Scale the node number down
    nodes_requested = 2
    result = nodes_scale(nodes_requested, get_logs=True)
    assert len(result["nodes"]) == nodes_requested

    # Check the removed node is no longer accessible
    available_nodes = 0
    for node in scaled_up_nodes:
        try:
            _, node_info = get_node_info(node)
            available_nodes += 1 if node_info["status"] == "Trusted" else 0
        except subprocess.CalledProcessError as e: ...
    assert available_nodes == nodes_requested

def test_nodes_non_primary(setup_kms):
    nodes = nodes_scale(2, get_logs=True)["nodes"]

    # Communicate with the node which isn't primary
    non_primary_node = next(n for n in nodes if f"https://{n}" != os.getenv("KMS_URL"))

    # TODO: When #242 merges, do a simple test proposal
    deploy_app_code(
        env={
            **os.environ,
            "KMS_URL": f"https://{non_primary_node}",
        }
    )


if __name__ == "__main__":
    pytest.main([__file__, "-s"])
