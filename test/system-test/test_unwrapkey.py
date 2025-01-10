import json
import pytest
from endpoints import key, refresh, unwrapKey
from utils import apply_kms_constitution, apply_key_release_policy, trust_jwt_issuer, get_test_attestation, get_test_public_wrapping_key, decrypted_wrapped_key, apply_settings_policy

# This test will check the two step google protocol to retrieve a private key
# Step 1, call the /key endpoint and retrieve the kid
# Step 2, call the /unwrapKey endpoint with the kid and the wrapping key to retrieve a wrapped private key
# Step 3, decrypt the wrapped private key


def test_unwrap_key_and_decrypt(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    apply_settings_policy()
    refresh()
    while True:
        status_code, key_json = key(
            attestation=get_test_attestation(),
            wrapping_key=get_test_public_wrapping_key(),
        )
        if status_code != 202:
            break
    assert status_code == 200

    # unwrap key
    status_code, unwrapped_json = unwrapKey(
        attestation=get_test_attestation(),
        wrapping_key=get_test_public_wrapping_key(),
        wrappedKid=key_json["wrappedKid"]
    )
    assert status_code == 200
    unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
    unwrapped_json = json.loads(unwrapped)
    print(unwrapped_json)
    assert unwrapped_json["kty"] == "OKP"


def test_unwrap_key_missing_attestation(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    apply_settings_policy()
    refresh()
    while True:
        status_code, key_json = key(
            attestation=get_test_attestation(),
            wrapping_key=get_test_public_wrapping_key(),
        )
        if status_code != 202:
            break
    assert status_code == 200

    # unwrap key
    status_code, unwrapped_json = unwrapKey(
        attestation="abc",
        wrapping_key=get_test_public_wrapping_key(),
        wrappedKid=key_json["wrappedKid"]
    )
    assert status_code == 400


def test_unwrap_key_missing_wrapping_key(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    apply_settings_policy()
    refresh()
    while True:
        status_code, key_json = key(
            attestation=get_test_attestation(),
            wrapping_key=get_test_public_wrapping_key(),
        )
        if status_code != 202:
            break
    assert status_code == 200

    # unwrap key
    status_code, unwrapped_json = unwrapKey(
        attestation=get_test_attestation(),
        wrapping_key="abc",
        wrappedKid=key_json["wrappedKid"]
    )
    assert status_code == 400


def test_unwrap_key_missing_wrappedKid(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()
    apply_settings_policy()
    refresh()

    # unwrap key
    status_code, unwrapped_json = unwrapKey(
        attestation=get_test_attestation(),
        wrapping_key=get_test_public_wrapping_key(),
        wrappedKid=""
    )
    assert status_code == 404


def test_unwrap_key_without_refresh(setup_kms):
    apply_kms_constitution()
    apply_key_release_policy()

    # unwrap key
    status_code, unwrapped_json = unwrapKey(
        attestation=get_test_attestation(),
        wrapping_key=get_test_public_wrapping_key(),
        wrappedKid="abcd"
    )
    assert status_code == 404


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])