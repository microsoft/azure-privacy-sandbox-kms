import os
import subprocess

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))


def heartbeat(kms_url):
    resp = subprocess.run(
        [
            "curl",
            f"{kms_url}/app/heartbeat",
            "--cacert",
            f"{REPO_ROOT}/workspace/sandbox_common/service_cert.pem",
            "--cert",
            f"{REPO_ROOT}/workspace/sandbox_common/member0_cert.pem",
            "--key",
            f"{REPO_ROOT}/workspace/sandbox_common/member0_privk.pem",
            "-i",
            "-w",
            "%{http_code}",
        ],
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    print(resp.stdout)
    assert resp.stdout.strip()[-3:] == "200", resp.stdout


def test_heartbeat(setup_kms):  # Expected to fail because of typo in heartbeat
    heartbeat(setup_kms["url"])
