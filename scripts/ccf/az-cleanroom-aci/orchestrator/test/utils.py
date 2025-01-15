import base64
from contextlib import contextmanager
import hashlib
import json
import os
import subprocess
import time
from typing import Callable, TypedDict
import uuid


REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), *([".."] * 5)))


def get_final_json(s: str) -> dict:
    """
    Finds the last valid JSON object in a given string, used to extract env
    variables emitted by KMS scripts.
    """
    for sub in reversed(s.split("{")):
        try:
            return json.loads("{" + sub)
        except json.JSONDecodeError:
            ...


def call_script(args, **kwargs):
    """
    Wrapper for subprocess.run which also assumes the output will be a dict of
    environment variables which we then set here.
    """
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


def unique_string() -> str:
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


class NodesScaleResult(TypedDict, total=False):
    nodes: list[dict] # URL of the node


def nodes_scale(node_count: int, get_logs=False, check=False) -> NodesScaleResult:
    get_logs_arg = {"stdout": subprocess.PIPE} if get_logs or check else {}
    res = subprocess.run(
        [f"scripts/ccf/az-cleanroom-aci/scale-nodes.sh", "-n", str(node_count)],
        cwd=REPO_ROOT,
        check=True,
        **get_logs_arg,
    )

    if get_logs or check:
        result = get_final_json(res.stdout.decode())

    if check:
        assert len(result["nodes"]) == node_count

    if get_logs:
        return result



def get_network_health():
    res = subprocess.run(
        [
            "az", "cleanroom", "ccf", "network", "show-health",
            "--name", os.getenv("DEPLOYMENT_NAME"),
            "--provider-client", f'{os.getenv("DEPLOYMENT_NAME")}-provider',
            "--provider-config", f'{os.getenv("WORKSPACE")}/providerConfig.json',
        ],
        stdout=subprocess.PIPE,
    )

    return json.loads(res.stdout.decode())

class NodeHealth(TypedDict, total=False):
    status: str
class NetworkHealth(TypedDict, total=False):
    nodeHealth: list[NodeHealth]


def wait_for_network_condition(condition: Callable[[NetworkHealth], bool], timeout=60):

    timeout = time.time() + timeout
    while time.time() < timeout:
        try:
            network_health = get_network_health()
            if condition(network_health):
                break
        except:
            print("Failed to get network health")
        time.sleep(5)
    assert condition(network_health)


def healthy_node_count(network_health: NetworkHealth) -> int:
    return sum(n["status"] == "Ok" for n in network_health["nodeHealth"])


def stop_node(node_name: str):
    print(f"Stopping node: {node_name}")
    subprocess.run(
        [
            "az", "container", "stop",
            "--name", node_name,
            "--resource-group", 'azure-key-management-service',
        ],
        check=True,
    )

def node_url_to_name(node_url: str) -> str:
    node_name_plus_uid = node_url.split(".")[0]
    node_name = "-".join(node_name_plus_uid.split("-")[:-1])
    return node_name


@contextmanager
def deploy_ccf_network():
    deployment_name = os.getenv("DEPLOYMENT_NAME", f"kms-{unique_string()}")
    call_script(
        [f"scripts/ccf/az-cleanroom-aci/up.sh", "--force-recreate"],
        env={
            **os.environ,
            "DEPLOYMENT_NAME": deployment_name,
        },
    )

    yield

    call_script(
        [f"scripts/ccf/az-cleanroom-aci/down.sh"],
        env={
            **os.environ,
            "DEPLOYMENT_NAME": deployment_name,
        },
    )


@contextmanager
def deploy_orchestrator():
    subprocess.run(
        [
            "docker", "compose",
            "-f", f"{REPO_ROOT}/scripts/ccf/az-cleanroom-aci/orchestrator/compose.yml",
            "up", "ccf-orchestrator", "--wait", "--build"
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
