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

def unique_string():
    random_uuid = uuid.uuid4().bytes
    timestamp = time.time_ns().to_bytes(8, 'big', signed=False)
    pid = os.getpid().to_bytes(4, 'big', signed=False)

    combined = random_uuid + timestamp + pid
    hashed = hashlib.sha256(combined).digest()

    return base64.urlsafe_b64encode(hashed).decode() \
        .rstrip('=') \
        .replace("-", "") \
        .replace("_", "") \
        .lower()[:12]

@pytest.fixture()
def setup_kms():

    deployment_name = os.getenv("DEPLOYMENT_NAME", f"kms-{unique_string()}")
    use_akv = os.getenv("USE_AKV", False)

    # Setup the CCF backend and set the environment accordingly
    try:
        res = subprocess.run(
            [f"scripts/{TEST_ENVIRONMENT}/up.sh", "--force-recreate"],
            env={
                **os.environ,
                "DEPLOYMENT_NAME": deployment_name,
            },
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            check=True,
        ).stdout.decode()
        setup_vars = json.loads(res[res.rfind("{"):])
        os.environ.update(setup_vars)

        res = subprocess.run(
            ["make", "jwt-issuer-up"],
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.PIPE,
        ).stdout.decode()
        setup_vars = json.loads(res[res.rfind("{"):])
        os.environ.update(setup_vars)

        if use_akv:
            res = subprocess.run(
                ["./scripts/akv/up.sh", f"{deployment_name}-akv"],
                cwd=REPO_ROOT,
                check=True,
                stdout=subprocess.PIPE,
            )
            res = res.stdout.decode()
            setup_vars = json.loads(res[res.rfind("{"):])
            os.environ.update(setup_vars)

            res = subprocess.run(
                ["./scripts/akv/key-import.sh", "private-key"],
                cwd=REPO_ROOT,
                check=True,
                stdout=subprocess.PIPE,
            ).stdout.decode()
            setup_vars = json.loads(res[res.rfind("{"):])
            os.environ.update(setup_vars)

        deploy_app_code()

        yield

    finally:
        subprocess.run(
            [f"scripts/{TEST_ENVIRONMENT}/down.sh", deployment_name],
            env={
                **os.environ,
                "DEPLOYMENT_NAME": deployment_name,
            },
            check=False,
        )

        if use_akv:
            res = subprocess.run(
                ["./scripts/akv/down.sh", f"{deployment_name}-akv"],
                cwd=REPO_ROOT,
                check=True,
                stderr=subprocess.DEVNULL,
            )