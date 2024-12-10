import json
import os
import subprocess

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))

def call_endpoint(endpoint, **kwargs):

    command = [f"scripts/kms/endpoints/{endpoint}.sh"]
    for k, v in kwargs.items():
        command.extend([f'--{k.replace("_", "-")}', str(v)])

    *response, status_code = subprocess.run(
        command,
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
    ).stdout.decode().splitlines()

    return (
        int(status_code),
        json.loads("".join(response) or '{}'),
    )


def heartbeat(**kwargs):
    return call_endpoint("heartbeat", **kwargs)


def key(**kwargs):
    return call_endpoint("key", **kwargs)


def listpubkeys(**kwargs):
    return call_endpoint("listpubkeys", **kwargs)


def refresh(**kwargs):
    return call_endpoint("refresh", **kwargs)


def keyReleasePolicy(**kwargs):
    return call_endpoint("keyReleasePolicy", **kwargs)


def settingsPolicy(**kwargs):
    return call_endpoint("settingsPolicy", **kwargs)


def auth(**kwargs):
    return call_endpoint("auth", **kwargs)
