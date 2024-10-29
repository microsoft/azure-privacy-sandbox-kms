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
        ["make", "constitution-set", "constitution=governance/constitution/kms_actions.js"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def apply_key_release_policy(kms_url):
    subprocess.run(
        ["make", "release-policy-set",
        "release-policy-proposal=governance/proposals/set_key_release_policy_add.json"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def remove_key_release_policy(kms_url):
    subprocess.run(
        ["make", "release-policy-set",
        "release-policy-proposal=governance/proposals/set_key_release_policy_add.json"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def trust_jwt_issuer(kms_url):
    subprocess.run(
        ["make", "jwt-issuer-trust"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

