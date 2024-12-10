import subprocess
import time
import pytest

from utils import get_node_info, nodes_scale


def test_nodes_scale_up(setup_kms):
    nodes_requested = 2

    # Scale the node number up
    result = nodes_scale(nodes_requested, get_logs=True)
    assert len(result["nodes"]) == nodes_requested
    time.sleep(8)

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
    time.sleep(8)
    scaled_up_nodes = result["nodes"]
    assert len(result["nodes"]) == nodes_requested

    # Scale the node number down
    nodes_requested = 2
    result = nodes_scale(nodes_requested, get_logs=True)
    time.sleep(8)
    assert len(result["nodes"]) == nodes_requested

    # Check the removed node is no longer accessible
    available_nodes = 0
    for node in scaled_up_nodes:
        try:
            _, node_info = get_node_info(node)
            available_nodes += 1 if node_info["status"] == "Trusted" else 0
        except subprocess.CalledProcessError as e: ...
    assert available_nodes == nodes_requested


if __name__ == "__main__":
    pytest.main([__file__, "-s"])
