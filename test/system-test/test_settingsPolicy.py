import pytest
from utils import (
    apply_kms_constitution,
    apply_settings_policy,
    remove_key_release_policy,
)
from endpoints import settingsPolicy


def test_settingsPolicy_with_no_policy(setup_kms):
    status_code, settings_json = settingsPolicy(setup_kms["url"])
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
    status_code, settings_json = settingsPolicy(setup_kms["url"], auth=None)
    assert status_code == 401


def test_settingsPolicy_with_policy(setup_kms):
    apply_kms_constitution(setup_kms["url"], setup_kms["workspace"])
    apply_settings_policy(setup_kms["url"], setup_kms["workspace"])
    status_code, settings_json = settingsPolicy(setup_kms["url"])
    assert status_code == 200
    assert settings_json == {
        "service": {
            "name": "azure-privacy-sandbox-kms",
            "description": "Key Management Service",
            "version": "1.0.0",
            "debug": True,
        }
    }


def test_settingsPolicy_with_custom_policy(setup_kms):
    apply_kms_constitution(setup_kms["url"], setup_kms["workspace"])

    settings_policy = {
        "service": {
            "name": "custom-kms",
            "description": "Custom Key Management Service",
            "version": "2.0.0",
            "debug": True,
        }
    }
    proposal = {
        "actions": [
            {
                "name": "set_settings_policy",
                "args": {
                    "settings_policy":  settings_policy
                }
            }
        ]
    }
    apply_settings_policy(setup_kms["url"], setup_kms["workspace"], proposal)

    status_code, settings_json = settingsPolicy(setup_kms["url"])
    assert status_code == 200
    assert settings_json == settings_policy
    # change policy
    settings_policy["service"]["debug"] = False
    proposal = {
        "actions": [
            {
                "name": "set_settings_policy",
                "args": {
                    "settings_policy":  settings_policy
                }
            }
        ]
    }
    apply_settings_policy(setup_kms["url"], setup_kms["workspace"], proposal)
    status_code, settings_json = settingsPolicy(setup_kms["url"])
    assert status_code == 200
    assert settings_json.get("service").get("debug") == False

if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-s"])
