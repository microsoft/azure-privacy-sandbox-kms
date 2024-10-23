import os
import subprocess

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))


def refresh(kms_url):
    resp = subprocess.run(
        [
            "curl",
            f"{kms_url}/app/refresh",
            "-X",
            "POST",
            "--cacert",
            f"{REPO_ROOT}/workspace/sandbox_common/service_cert.pem",
            "--cert",
            f"{REPO_ROOT}/workspace/sandbox_common/member0_cert.pem",
            "--key",
            f"{REPO_ROOT}/workspace/sandbox_common/member0_privk.pem",
            "-H",
            "Content-Type: application/json",
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


def test_single_refresh(setup_kms):
    refresh(setup_kms["url"])


def test_multiple_refresh(setup_kms):
    refresh(setup_kms["url"])
    refresh(setup_kms["url"])

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
