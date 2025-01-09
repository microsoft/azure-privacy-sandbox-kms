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

    print(f'Called "{" ".join(command)}"')
    print(f"Response Code: {status_code}")
    print(f'Response Body: {json.loads("".join(response) or "{}")}')

    return (
        int(status_code),
        json.loads("".join(response) or '{}'),
    )


def heartbeat(**kwargs):
    return call_endpoint("heartbeat", **kwargs)


def key(**kwargs):
    return call_endpoint("key", **kwargs)

def unwrapKey(**kwargs):
    return call_endpoint("unwrapKey", **kwargs)


def listpubkeys(**kwargs):
    return call_endpoint("listpubkeys", **kwargs)


def pubkey(**kwargs):
    return call_endpoint("pubkey", **kwargs)


def refresh(**kwargs):
    return call_endpoint("refresh", **kwargs)


def keyReleasePolicy(**kwargs):
    return call_endpoint("keyReleasePolicy", **kwargs)


def settingsPolicy(**kwargs):
    return call_endpoint("settingsPolicy", **kwargs)
