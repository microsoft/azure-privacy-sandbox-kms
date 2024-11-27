import json
import os
import subprocess

import requests

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))

def kms_request(endpoint, auth, method="GET", headers=[], body=None):
    delimiter = "\n___END___"
    header_arg = []
    for header in headers:
        header_arg.extend(["-H", f'"{header}"'])
    cert = ""
    if auth == "jwt":
        res = requests.post(
            url="http://localhost:3000/token",
        )
        header_arg.extend(["-H", f'Authorization: Bearer {json.loads(res.content)["access_token"]}'])
    elif auth == "member_cert":
        cert = f"{REPO_ROOT}/workspace/sandbox_common/member0_cert.pem"
    elif auth == "user_cert":
        cert = f"{REPO_ROOT}/workspace/sandbox_common/user0_cert.pem"
    resp = subprocess.run(
        [
            "curl",
            "-k",
            endpoint,
            "-X", method,
            "--cacert",
            f"{REPO_ROOT}/workspace/sandbox_common/service_cert.pem",
            *([
                "--cert",
                f"{REPO_ROOT}/workspace/sandbox_common/member0_cert.pem",
                "--key",
                f"{REPO_ROOT}/workspace/sandbox_common/member0_privk.pem",
            ] if cert != "" else []),
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


def heartbeat(kms_url, auth="member_cert"):
    return kms_request(f"{kms_url}/app/heartbeat", auth=auth)


def key(kms_url, kid=None, auth="jwt"):
    query_string = ""
    if kid is not None:
        query_string = "?"
    query_string += "&".join([
        *([f"kid={kid}"] if kid is not None else []),
    ])
    return kms_request(
        endpoint=f"{kms_url}/app/key{query_string}",
        method="POST",
        body='{}',
        auth=auth,
    )


def listpubkeys(kms_url, auth="member_cert"):
    return kms_request(f"{kms_url}/app/listpubkeys", auth=auth)


def refresh(kms_url, auth="member_cert"):
    return kms_request(f"{kms_url}/app/refresh", method="POST", auth=auth)


def keyReleasePolicy(kms_url, auth="member_cert"):
    return kms_request(f"{kms_url}/app/keyReleasePolicy", auth=auth)


def settingsPolicy(kms_url, auth="member_cert"):
    return kms_request(f"{kms_url}/app/settingsPolicy", auth=auth)