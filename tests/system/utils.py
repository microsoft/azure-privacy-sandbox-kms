import os
import subprocess


REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))


def deploy_app_code(kms_url):
    print("")
    subprocess.run(
        ["make", "js-app-set"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def apply_kms_constitution(kms_url):
    subprocess.run(
        ["make", "constitution-set", "constitution=constitutions/default.js"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def apply_key_release_policy(kms_url):
    subprocess.run(
        ["make", "release-policy-set", "release-policy-proposal=proposals/set_key_release_policy_add.json"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def remove_key_release_policy(kms_url):
    subprocess.run(
        ["make", "release-policy-set", "release-policy-proposal=proposals/set_key_release_policy_add.json"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def trust_jwt_issuer(kms_url):
    for target in (
        "propose-jwt-demo-validation-policy",
        "propose-jwt-ms-validation-policy",
        "trust-jwt-issuer",
    ):
        subprocess.run(
            ["make", target],
            env={
                **os.environ,
                "KMS_URL": kms_url,
                "MEMBER_COUNT": "1",
            },
            cwd=REPO_ROOT,
            check=True,
        )

