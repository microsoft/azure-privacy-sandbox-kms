import pytest
from utils import apply_kms_constitution, apply_key_release_policy, remove_key_release_policy
from endpoints import keyReleasePolicy

# TODO: Assert what we would expect the key release policy to be for all tests


@pytest.mark.xfail(strict=True) # TODO: Fix #175
def test_keyReleasePolicy_with_no_policy(setup_kms):
    status_code, key_release_json = keyReleasePolicy()
    assert status_code == 200


def test_keyReleasePolicy_with_policy_added(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    status_code, key_release_json = keyReleasePolicy()
    assert status_code == 200


def test_keyReleasePolicy_with_policy_added_then_removed(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    remove_key_release_policy()
    status_code, key_release_json = keyReleasePolicy()
    assert status_code == 200


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
