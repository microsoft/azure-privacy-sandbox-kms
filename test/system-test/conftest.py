import os
import subprocess
import pytest

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "local")


def setup_local():
    subprocess.run(
        ["make", "ccf-sandbox-up"],
        cwd=REPO_ROOT,
        check=True,
    )
    return "https://127.0.0.1:8000"


def teardown_local():
    subprocess.run(
        ["make", "ccf-sandbox-down"],
        cwd=REPO_ROOT,
        check=True,
    )


def setup_cloud():
    raise NotImplementedError("Cloud environment not yet implemented")


def teardown_cloud():
    raise NotImplementedError("Cloud environment not yet implemented")


def deploy_app_code(kms_url):
    subprocess.run(
        ["make", "deploy"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def apply_kms_constitution():
    # This is a separate function so tests can decide if they need it or not
    raise NotImplementedError("Todo")


@pytest.fixture(scope="function" if TEST_ENVIRONMENT == "local" else "session")
def setup_kms():

    setup, teardown = {
        "local": [setup_local, teardown_local],
        "cloud": [setup_cloud, teardown_cloud],
    }[TEST_ENVIRONMENT]

    kms_url = setup()
    deploy_app_code(kms_url)

    yield {"url": kms_url}

    teardown()
