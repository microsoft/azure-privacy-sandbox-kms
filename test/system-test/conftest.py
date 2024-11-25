import json
import os
import subprocess
import pytest
from utils import deploy_app_code
import string
import random

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "ccf/sandbox_local")


@pytest.fixture()
def setup_kms():

    os.environ["DEPLOYMENT_NAME"] = os.getenv(
        "DEPLOYMENT_NAME",
        f"kms-{''.join(random.choices(string.ascii_letters + string.digits, k=8))}".lower()
    )

    # Setup the CCF backend and set the environment accordingly
    res = subprocess.run(
            [f"scripts/{TEST_ENVIRONMENT}/up.sh", "--force-recreate"],
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.PIPE,
        ).stdout.decode()
    setup_vars = json.loads(res[res.rfind("{"):])
    os.environ.update(setup_vars)

    subprocess.run(
        ["make", "jwt-issuer-up"],
        cwd=REPO_ROOT,
        check=True,
    )
    os.environ["JWT_ISSUER"] = "http://localhost:3000/token"

    deploy_app_code()

    yield

    subprocess.run(
        f"scripts/{TEST_ENVIRONMENT}/down.sh",
    )
