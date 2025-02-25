import os
import pytest
from utils import (
    apply_kms_constitution,
    apply_settings_policy,
    remove_key_release_policy,
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


def test_settingsPolicy_with_no_auth(setup_kms):
    status_code, settings_json = settingsPolicy(auth=None)
    assert status_code == 401


def test_settingsPolicy_with_policy(setup_kms):
    apply_kms_constitution()

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
    apply_kms_constitution()

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
