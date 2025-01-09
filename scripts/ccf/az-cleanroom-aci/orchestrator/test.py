import base64
import hashlib
import json
import os
import subprocess
import time
import uuid
import pytest

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def get_final_json(s):
    for sub in reversed(s.split("{")):
        try:
            return json.loads("{" + sub)
        except json.JSONDecodeError:
            ...


def call_script(args, **kwargs):
    res = subprocess.run(
        args,
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        **kwargs,
    ).stdout.decode()
    print(res)
    try:
        setup_vars = json.loads(res[res.rfind("{"):])
        os.environ.update(setup_vars)
    except json.JSONDecodeError:
        ...


def unique_string():
    random_uuid = uuid.uuid4().bytes
    timestamp = time.time_ns().to_bytes(8, 'big', signed=False)
    pid = os.getpid().to_bytes(4, 'big', signed=False)

    combined = random_uuid + timestamp + pid
    hashed = hashlib.sha256(combined).digest()

    return base64.urlsafe_b64encode(hashed).decode() \
        .rstrip('=') \
        .replace("-", "") \
        .replace("_", "") \
        .lower()[:12]


def nodes_scale(node_count, get_logs=False):
    get_logs_arg = {"stdout": subprocess.PIPE} if get_logs else {}
    res = subprocess.run(
        [f"scripts/ccf/az-cleanroom-aci/scale-nodes.sh", "-n", str(node_count)],
        cwd=REPO_ROOT,
        check=True,
        **get_logs_arg,
    )
    if get_logs:
        return get_final_json(res.stdout.decode())


@pytest.fixture
def az_cleanroom():

    deployment_name = os.getenv("DEPLOYMENT_NAME", f"kms-{unique_string()}")
    call_script(
        [f"scripts/ccf/az-cleanroom-aci/up.sh", "--force-recreate"],
        env={
            **os.environ,
            "DEPLOYMENT_NAME": deployment_name,
        },
    )

    subprocess.run(
        [
            "docker", "compose",
            "-f", f"{REPO_ROOT}/scripts/ccf/az-cleanroom-aci/orchestrator/compose.yml",
            "up", "ccf-orchestrator", "-d"
        ],
        check=True,
    )

    yield

    subprocess.run(
        [
            "docker", "compose",
            "-f", f"{REPO_ROOT}/scripts/ccf/az-cleanroom-aci/orchestrator/compose.yml",
            "down", "ccf-orchestrator", "--remove-orphans"
        ],
        check=True,
    )

    call_script(
        [f"scripts/ccf/az-cleanroom-aci/down.sh"],
        env={
            **os.environ,
            "DEPLOYMENT_NAME": deployment_name,
        },
    )


def get_network_health():
    res = subprocess.run(
        [
            "az", "cleanroom", "ccf", "network", "show-health",
            "--name", os.getenv("DEPLOYMENT_NAME"),
            "--provider-client", f"{os.getenv("DEPLOYMENT_NAME")}-provider",
            "--provider-config", f"{os.getenv("WORKSPACE")}/providerConfig.json",
        ],
        check=True,
        stdout=subprocess.PIPE,
    )

    print(res.stdout.decode())
    return json.loads(res.stdout.decode())


def test_kill_node(az_cleanroom):

    # Scale up nodes
    node_count = 3
    result = nodes_scale(node_count, get_logs=True)
    assert len(result["nodes"]) == node_count

    # Manually Kill a Node
    subprocess.run(
        [
            "az", "container", "stop",
            "--name", "-".join(result['nodes'][-1].split(".")[0].split("-")[:-1]),
            "--resource-group", 'azure-key-management-service',
        ],
        check=True,
    )

    # Confirm that the node is dead
    network_health = get_network_health()
    healthy_node_count = sum(n["status"] == "Ok" for n in network_health["nodeHealth"])
    assert healthy_node_count == node_count - 1

    # Wait for the orchestrator to heal the network
    timeout = time.time() + (10 * 60) # 10 minutes
    while time.time() < timeout:
        network_health = get_network_health()
        if sum(n["status"] == "Ok" for n in network_health["nodeHealth"]) == node_count:
            break
        time.sleep(5)
    assert sum(n["status"] == "Ok" for n in network_health["nodeHealth"]) == node_count

    # Wait for the orchestrator to remove any dead nodes
    timeout = time.time() + (10 * 60) # 10 minutes
    while time.time() < timeout:
        network_health = get_network_health()
        if sum(n["status"] == "NeedsReplacement" for n in network_health["nodeHealth"]) == 0:
            break
        time.sleep(5)
    assert sum(n["status"] == "NeedsReplacement" for n in network_health["nodeHealth"]) == 0

