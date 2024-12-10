import json
import os
import subprocess
import pytest
from utils import deploy_app_code

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "ccf/sandbox_local")


@pytest.fixture()
def setup_kms():

    # Setup the CCF backend and set the environment accordingly
    setup_vars = json.loads(subprocess.run(
            [f"scripts/{TEST_ENVIRONMENT}/up.sh", "--force-recreate"],
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.PIPE,
        ).stdout.decode())
    os.environ.update(setup_vars)

    subprocess.run(
        ["make", "jwt-issuer-up"],
        cwd=REPO_ROOT,
        check=True,
    )
    os.environ["JWT_TOKEN_ISSUER_URL"] = "http://localhost:3000/token"
    os.environ["JWT_ISSUER"] = "http://Demo-jwt-issuer"

    deploy_app_code()

    yield

    subprocess.run(
        f"scripts/{TEST_ENVIRONMENT}/down.sh",
    )
