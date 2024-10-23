import json
import os
import subprocess

from test_refresh import refresh

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))


def listpubkeys(kms_url):
    resp = subprocess.run(
        [
            "curl",
            f"{kms_url}/app/listpubkeys",
            "--cacert",
            f"{REPO_ROOT}/workspace/sandbox_common/service_cert.pem",
        ],
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        return json.loads(resp.stdout)["keys"]
    except json.JSONDecodeError:
        print(
            """
Current behaviour of listpubkeys is to return nothing if no keys are present,
it should probably be the same schema json with no keys.
            """
        )
        raise


def test_no_keys_initially(setup_kms):  # Expected to fail, see note above
    pubkeys = listpubkeys(setup_kms["url"])
    assert len(pubkeys) == 0


def test_refresh_key_appears(setup_kms):
    refresh(setup_kms["url"])
    pubkeys = listpubkeys(setup_kms["url"])
    assert len(pubkeys) == 1

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
