import json
import os
import subprocess
import pytest
from utils import deploy_app_code
import string
import random
import uuid
import time
import hashlib
import base64

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "ccf/sandbox_local")

@pytest.fixture()
def setup_kms():

    deployment_name = os.getenv(
        "DEPLOYMENT_NAME",
        f"kms-{''.join(random.choices(string.ascii_letters + string.digits, k=8))}".lower()
    )
    os.environ["DEPLOYMENT_NAME"] = deployment_name

    # Setup the CCF backend and set the environment accordingly
    res = subprocess.run(
        [f"scripts/{TEST_ENVIRONMENT}/up.sh", "--force-recreate"],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        if res.returncode != 0:
            raise Exception(f"HERE: {res.stdout.decode()} - {res.stderr.decode()}")

        stdout = res.stdout.decode()
        setup_vars = json.loads(stdout[stdout.rfind("{"):])
        os.environ.update(setup_vars)

        res = subprocess.run(
            ["make", "jwt-issuer-up"],
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout = res.stdout.decode()
        setup_vars = json.loads(stdout[stdout.rfind("{"):])
        os.environ.update(setup_vars)

        deploy_app_code()

        yield

    except Exception as e:
        print(e)
        try:
            print(res.stdout.decode())
            print(res.stderr.decode())
        except Exception: ...
        raise

    finally:
        subprocess.run(
            [f"scripts/{TEST_ENVIRONMENT}/down.sh", deployment_name],
        )
