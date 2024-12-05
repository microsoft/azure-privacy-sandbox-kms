import pytest
from endpoints import key, refresh
from utils import apply_kms_constitution, apply_key_release_policy, trust_jwt_issuer, get_test_attestation, get_test_wrapping_key


@pytest.mark.xfail(strict=True)
def test_no_keys(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    while True:
        status_code, key_json = key(auth="jwt")
        if status_code != 202:
            break
    assert status_code == 404

def test_no_jwt_policy(setup_kms):
    apply_kms_constitution()
    refresh()
    while True:
        status_code, key_json = key(auth="jwt")
        if status_code != 202:
            break
    assert status_code == 401
    

def test_no_key_release_policy(setup_kms):
    apply_kms_constitution()
    trust_jwt_issuer()
    refresh()
    while True:
        status_code, key_json = key(auth="jwt")
        if status_code != 202:
            break
    assert status_code == 500


def test_with_keys_and_policy(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    refresh()
    while True:
        status_code, key_json = key(auth="jwt")
        if status_code != 202:
            break
    assert status_code == 200


def test_with_keys_and_policy_jwt_auth(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    refresh()
    while True:
        status_code, key_json = key(auth="jwt")
        if status_code != 202:
            break
    assert status_code == 200


def test_key_with_multiple(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    refresh()
    refresh()
    while True:
        status_code, key_json = key(auth="jwt")
        if status_code != 202:
            break
    assert status_code == 200


# Test kid parameter

def test_key_kid_not_present_with_other_keys(setup_kms):
    refresh()
    refresh()
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    while True:
        status_code, key_json = key(
            auth="jwt",
            kid="doesntexist"
        )
        if status_code != 202:
            break
    assert status_code == 400



def test_key_kid_not_present_without_other_keys(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    while True:
        status_code, key_json = key(
            auth="jwt",
            kid="doesntexist"
        )
        if status_code != 202:
            break
    assert status_code == 400


def test_key_kid_present(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    _, refresh_json = refresh()
    refresh()
    while True:
        status_code, key_json = key(
            auth="jwt",
            kid=refresh_json["id"]
        )
        if status_code != 202:
            break
    assert status_code == 200
    assert refresh_json["id"] == 1


def test_key_refresh_all_ids(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    trust_jwt_issuer()
    for _ in range(256):
        _, refresh_json = refresh()
    
    while True:
        status_code, key_json = key(
            auth="jwt",
            kid=refresh_json["id"]
        )
        if status_code != 202:
            break
    assert status_code == 200
    print(f"key_json: {key_json}")  # Debug print to see the contents of key_json

    assert key_json["kid"] == 0
    assert key_json["kid"] == refresh_json["id"]


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])