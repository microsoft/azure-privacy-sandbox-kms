from conftest import stop_node, node_url_to_name, nodes_scale, wait_for_network_condition, healthy_node_count


def test_kill_node(az_cleanroom):

    # Scale up nodes
    node_count = 3
    result = nodes_scale(node_count, get_logs=True)
    assert len(result["nodes"]) == node_count

    stop_node(node_url_to_name(result['nodes'][-1]))

    # Confirm that the node is dead
    wait_for_network_condition(
        condition=lambda nh: healthy_node_count(nh) == node_count - 1,
    )

    # Wait for the orchestrator to heal the network
    wait_for_network_condition(
        condition=lambda nh: all([
            healthy_node_count(nh) == node_count,
            sum(n["status"] == "NeedsReplacement" for n in nh["nodeHealth"]) == 0
        ]),
        timeout= 60 * 10, # 10 minutes
    )
