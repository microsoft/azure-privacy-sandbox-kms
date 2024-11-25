import pytest
from utils import apply_kms_constitution, apply_settings_policy, remove_key_release_policy
from endpoints import settingsPolicy



def test_settingsPolicy_with_no_policy(setup_kms):
    status_code, settings_json = settingsPolicy(setup_kms["url"])
    assert status_code == 200
    assert settings_json == {
    "service": {
        "name": "azure-privacy-sandbox-kms",
        "description": "Key Management Service",
        "version": "1.0.0",
        "debug": False
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
        "debug": True
        }
    }

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
