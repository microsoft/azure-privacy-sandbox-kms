import json
import os
import subprocess
import pytest
from utils import deploy_app_code

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "ccf/sandbox-local")


@pytest.fixture()
def setup_kms():

    # Setup the CCF backend and set the environment accordingly
    setup_vars = json.loads(
        subprocess.run(
            f"scripts/{TEST_ENVIRONMENT}/up.sh",
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.PIPE,
        ).stdout.decode()
    )
    print(setup_vars)
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
