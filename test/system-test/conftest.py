import base64
import hashlib
import json
import os
import subprocess
import time
import uuid

import pytest

from utils import deploy_app_code

REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEST_ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "ccf/sandbox_local")
USE_AKV = os.getenv("USE_AKV", 'False').lower() == 'true'


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

os.environ["UNIQUE_ID"] = unique_string()


def call_script(args, **kwargs):
    res = subprocess.run(
        args,
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        **kwargs,
    ).stdout.decode()
    print(res)
    try:
        setup_vars = json.loads(res[res.rfind("{"):])
        os.environ.update(setup_vars)
    except json.JSONDecodeError:
        ...


@pytest.fixture()
def setup_jwt_issuer():
    try:
        call_script(
            ["./scripts/jwt_issuer/up.sh", "--build"],
            env={
                **os.environ,
                "JWT_ISSUER_WORKSPACE": f"{REPO_ROOT}/jwt_issuer_workspace",
            },
        )
        yield
    finally:
        call_script("./scripts/jwt_issuer/down.sh")


@pytest.fixture(scope="session")
def setup_akv():
    akv_name = os.getenv("AKV_VAULT_NAME", f"akv-{unique_string()}")
    if USE_AKV:
        try:
            call_script(["./scripts/akv/up.sh", akv_name])
            yield
        finally:
            call_script(
                ["./scripts/akv/down.sh", akv_name],
                stderr=subprocess.DEVNULL,
            )
    else:
        yield


@pytest.fixture()
def setup_ccf():
    for _ in range(10):
        try:
            deployment_name = os.getenv("DEPLOYMENT_NAME", f"kms-{unique_string()}")
            call_script(
                [f"scripts/{TEST_ENVIRONMENT}/up.sh", "--force-recreate"],
                env={
                    **os.environ,
                    "DEPLOYMENT_NAME": deployment_name,
                },
            )
            break
        except Exception:
            try:
                call_script(
                    [f"scripts/{TEST_ENVIRONMENT}/down.sh"],
                    env={
                        **os.environ,
                        "DEPLOYMENT_NAME": deployment_name,
                    },
                )
            except Exception: ...

    yield

    call_script(
        [f"scripts/{TEST_ENVIRONMENT}/down.sh"],
        env={
            **os.environ,
            "DEPLOYMENT_NAME": deployment_name,
        },
    )


@pytest.fixture()
def setup_kms(setup_ccf, setup_akv):
    if USE_AKV:
        call_script([
            "./scripts/akv/key-import.sh",
            f'{os.getenv("DEPLOYMENT_NAME", "kms")}-private-key'
        ])
    deploy_app_code()
    yield
    print("") # Prevents cleanup overwriting result