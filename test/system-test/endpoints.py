import json
import os
import subprocess

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))

def kms_request(endpoint, method="GET", headers=[], body=None):
    delimiter = "\n___END___"
    header_arg = []
    for header in headers:
        header_arg.extend(["-H", f'"{header}"'])
    resp = subprocess.run(
        [
            "curl",
            "-k",
            endpoint,
            "-X", method,
            "--cacert",
            f"{REPO_ROOT}/workspace/sandbox_common/service_cert.pem",
            "--cert",
            f"{REPO_ROOT}/workspace/sandbox_common/member0_cert.pem",
            "--key",
            f"{REPO_ROOT}/workspace/sandbox_common/member0_privk.pem",
            *header_arg,
            *(["-d", body] if body is not None else []),
            "-s",
            "-w", f"{delimiter}%{{http_code}}\n"
        ],
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    body, status_line = resp.stdout.rsplit(delimiter, 1)
    status_code = int(status_line.strip('\n'))
    if status_code != 200:
        return (status_code, None)
    else:
        return (status_code, json.loads(body))


def heartbeat(kms_url):
    return kms_request(f"{kms_url}/app/heartbeat")


def key(kms_url, attestation, wrapping_key):
    return kms_request(
        endpoint=f"{kms_url}/app/key",
        method="POST",
        body=f'{{\"attestation\": {attestation}, \"wrappingKey\": {wrapping_key}}}',
    )


def listpubkeys(kms_url):
    return kms_request(f"{kms_url}/app/listpubkeys")


def pubkey(kms_url, kid=None, fmt=None):
    query_string = ""
    if kid is not None or fmt is not None:
        query_string = "?"
    query_string += "&".join([
        *([f"kid={kid}"] if kid is not None else []),
        *([f"fmt={fmt}"] if fmt is not None else []),
    ])
    return kms_request(f"{kms_url}/app/pubkey{query_string}")


def refresh(kms_url):
    return kms_request(f"{kms_url}/app/refresh", method="POST")


def keyReleasePolicy(kms_url):
    return kms_request(f"{kms_url}/app/keyReleasePolicy")