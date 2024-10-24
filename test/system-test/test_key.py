import pytest
from endpoints import key, refresh
from utils import apply_kms_constitution, apply_key_release_policy


def test_key(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    refresh(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
        )
        if status_code != 202:
            break
    assert status_code == 200


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])