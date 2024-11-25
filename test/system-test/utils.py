import json
import os
import subprocess
import tempfile


REPO_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", ".."))


def deploy_app_code(kms_url, workspace):
    print("")
    subprocess.run(
        ["make", "js-app-set"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
            "KMS_WORKSPACE": workspace,
        },
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def apply_kms_constitution(kms_url, workspace):
    subprocess.run(
        ["make", "constitution-set", "constitution=governance/constitution/kms_actions.js"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
            "KMS_WORKSPACE": workspace,
        },
        cwd=REPO_ROOT,
        check=True,
    )


def apply_settings_policy(kms_url, workspace, settings_policy_proposal_json=None):
    if settings_policy_proposal_json:
        print("Creating temporary settings policy file: ", settings_policy_proposal_json)

        # Create a temporary file for the settings policy JSON
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp_file:
            temp_file.write(json.dumps(settings_policy_proposal_json).encode())
            proposal_path = temp_file.name
    else:
        # Use the default settings policy file
        proposal_path = os.path.join(REPO_ROOT, "governance/policies/settings-policy.json")

    try:
        subprocess.run(
            ["make", "settings-policy-set",
            f"settings-policy-proposal={proposal_path}"],
            env={
                **os.environ,
                "KMS_URL": kms_url,
                "KMS_WORKSPACE": workspace,
            },
            cwd=REPO_ROOT,
            check=True,
        )
    finally:
        # Clean up the temporary file if it was created
        if settings_policy_proposal_json:
            print(f"Removing temporary file: {proposal_path}")
            os.remove(proposal_path)


def apply_key_release_policy(kms_url, workspace):
    subprocess.run(
        ["make", "release-policy-set",
        "release-policy-proposal=governance/proposals/set_key_release_policy_add.json"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
            "KMS_WORKSPACE": workspace,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def remove_key_release_policy(kms_url, workspace):
    subprocess.run(
        ["make", "release-policy-set",
        "release-policy-proposal=governance/proposals/set_key_release_policy_add.json"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
            "KMS_WORKSPACE": workspace,
        },
        cwd=REPO_ROOT,
        check=True,
    )

def trust_jwt_issuer(kms_url, workspace):
    subprocess.run(
        ["make", "jwt-issuer-trust"],
        env={
            **os.environ,
            "KMS_URL": kms_url,
            "KMS_WORKSPACE": workspace,
        },
        cwd=REPO_ROOT,
        check=True,
    )

