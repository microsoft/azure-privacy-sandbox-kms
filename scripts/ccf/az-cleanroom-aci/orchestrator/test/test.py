from utils import deploy_ccf_network, deploy_orchestrator, stop_node, node_url_to_name, nodes_scale, wait_for_network_condition, healthy_node_count

full_network_node_count = 3

def test_kill_node_while_orchestrator_running():
    with deploy_ccf_network():
        with deploy_orchestrator():
            result = nodes_scale(full_network_node_count, check=True, get_logs=True)

            stop_node(node_url_to_name(result['nodes'][-1]))

            wait_for_network_condition(
                condition=lambda nh: healthy_node_count(nh) == full_network_node_count - 1,
            )

            print("Waiting for network to heal")
            print("  i.e. 3 available nodes and no nodes requiring replacement")
            wait_for_network_condition(
                condition=lambda nh: all([
                    healthy_node_count(nh) == full_network_node_count,
                    sum(n["status"] == "NeedsReplacement" for n in nh["nodeHealth"]) == 0
                ]),
                timeout= 60 * 10, # 10 minutes
            )


def test_kill_node_before_orchestrator_running():
    with deploy_ccf_network():
        result = nodes_scale(full_network_node_count, check=True, get_logs=True)

        stop_node(node_url_to_name(result['nodes'][-1]))

        wait_for_network_condition(
            condition=lambda nh: healthy_node_count(nh) == full_network_node_count - 1,
        )

        with deploy_orchestrator():
            print("Waiting for network to heal")
            print("  i.e. 3 available nodes and no nodes requiring replacement")
            wait_for_network_condition(
                condition=lambda nh: all([
                    healthy_node_count(nh) == full_network_node_count,
                    sum(n["status"] == "NeedsReplacement" for n in nh["nodeHealth"]) == 0
                ]),
                timeout= 60 * 10, # 10 minutes
            )


