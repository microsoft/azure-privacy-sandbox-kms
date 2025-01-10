from conftest import stop_node, node_url_to_name, nodes_scale, wait_for_network_condition, healthy_node_count


def test_kill_node(az_cleanroom):

    # Scale up nodes
    node_count = 3
    result = nodes_scale(node_count, get_logs=True)
    assert len(result["nodes"]) == node_count

    print("3 node network running, killing one node through ACI")
    stop_node(node_url_to_name(result['nodes'][-1]))

    print("Waiting for the network to see node as unhealthy")
    wait_for_network_condition(
        condition=lambda nh: healthy_node_count(nh) == node_count - 1,
    )
    print("Unhealthy node found")

    print("Waiting for network to heal")
    print("  i.e. 3 available nodes and no nodes requiring replacement")
    wait_for_network_condition(
        condition=lambda nh: all([
            healthy_node_count(nh) == node_count,
            sum(n["status"] == "NeedsReplacement" for n in nh["nodeHealth"]) == 0
        ]),
        timeout= 60 * 10, # 10 minutes
    )
