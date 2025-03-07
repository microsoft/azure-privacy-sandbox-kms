import os
from subprocess import CalledProcessError
import pytest
from utils import (
    apply_settings_policy,
)
from endpoints import settingsPolicy


def test_settingsPolicy_with_no_policy(setup_kms):
    status_code, settings_json = settingsPolicy()
    assert status_code == 200
    assert settings_json == {
        "service": {
            "name": "azure-privacy-sandbox-kms",
            "description": "Key Management Service",
            "version": "1.0.0",
            "debug": False,
        }
    }


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="This will fail until we enforce the role in ACL",
)
def test_set_settingsPolicy_with_reader(setup_kms, monkeypatch):

    # Temporarily use the user cert as the member cert
    monkeypatch.setenv("KMS_MEMBER_CERT_PATH", os.getenv("KMS_USER_CERT_PATH"))
    monkeypatch.setenv("KMS_MEMBER_PRIVK_PATH", os.getenv("KMS_USER_PRIVK_PATH"))

    with pytest.raises(CalledProcessError):
        apply_settings_policy()


def test_settingsPolicy_with_policy(setup_kms):

    policy = {
        "service": {
            "name": "custom-kms",
            "description": "Custom Key Management Service",
            "version": "2.0.0",
            "debug": True,
        }
    }
    apply_settings_policy(policy)

    status_code, settings_json = settingsPolicy()
    assert status_code == 200
    assert settings_json == policy


def test_settingsPolicy_with_multiple_policy_sets(setup_kms):

    policy = {
        "service": {
            "name": "custom-kms",
            "description": "Custom Key Management Service",
            "version": "2.0.0",
            "debug": True,
        }
    }
    apply_settings_policy(policy)
    status_code, settings_json = settingsPolicy()
    assert status_code == 200
    assert settings_json == policy

    different_policy = {
        "service": {
            "name": "custom-kms-2",
            "description": "Custom Key Management Service 2",
            "version": "2.0.1",
            "debug": False,
        }
    }
    apply_settings_policy(different_policy)
    status_code, settings_json = settingsPolicy()
    assert status_code == 200
    assert settings_json == different_policy

if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-s"])
