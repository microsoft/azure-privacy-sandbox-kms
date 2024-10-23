import os
import subprocess


REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))


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


def apply_kms_constitution(kms_url):
    subprocess.run(
        ["make", "propose-constitution"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def apply_key_release_policy(kms_url):
    subprocess.run(
        ["make", "propose-add-key-release-policy"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def remove_key_release_policy(kms_url):
    subprocess.run(
        ["make", "propose-rm-key-release-policy"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
        },
        cwd=REPO_ROOT,
        check=True,
    )