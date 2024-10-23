import os
import random
import string
import subprocess
import pytest
from dotenv import dotenv_values

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "local")


def setup_local():
    subprocess.run(
        ["make", "ccf-sandbox-up"],
        cwd=REPO_ROOT,
        check=True,
    )
    return "https://127.0.0.1:8000"


def teardown_local(kms_url):
    subprocess.run(
        ["make", "ccf-sandbox-down"],
        cwd=REPO_ROOT,
        check=True,
    )


def setup_cloud():
    deployment_name = os.getenv(
        "DEPLOYMENT_NAME",
        "kms-" + ''.join(random.choice(string.ascii_letters) for _ in range(8))
    )
    subprocess.run(
        ["make", "ccf-sandbox-aci-up", f"deployment-name={deployment_name}"],
        cwd=REPO_ROOT,
    )
    return f"https://{deployment_name}.{dotenv_values('ccf_sandbox/.env')['LOCATION']}.azurecontainer.io:8000"


def teardown_cloud(kms_url):
    deployment_name = kms_url.split(".")[0][8:]
    subprocess.run(
        ["make", "ccf-sandbox-aci-down", f"deployment-name={deployment_name}"],
        cwd=REPO_ROOT,
        check=True,
    )


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

    teardown(kms_url)
