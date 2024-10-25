import pytest
from endpoints import key, refresh
from utils import apply_kms_constitution, apply_key_release_policy

@pytest.mark.xfail(strict=True)
def test_no_keys(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
        )
        if status_code != 202:
            break
    assert status_code == 404


def test_no_key_release_policy(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    refresh(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
        )
        if status_code != 202:
            break
    assert status_code == 500


@pytest.mark.xfail(strict=True)
def test_with_keys_and_policy(setup_kms):
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
    assert key_json["wrapped"] != ""


def test_key_with_multiple(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    refresh(setup_kms["url"])
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
    assert key_json["wrappedKid"].endswith("_2")


# def test_key_valid_attestation_not_accepted(setup_kms): ...


# def test_key_incorrectly_signed_attestation(setup_kms): ...


# def test_key_invalid_wrapping_key(setup_kms): ...


# Test kid parameter


def test_key_kid_not_present_with_other_keys(setup_kms):
    refresh(setup_kms["url"])
    refresh(setup_kms["url"])
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
            kid="doesntexist"
        )
        if status_code != 202:
            break
    assert status_code == 404


def test_key_kid_not_present_without_other_keys(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
            kid="doesntexist"
        )
        if status_code != 202:
            break
    assert status_code == 404


def test_key_kid_present(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    _, refresh_json = refresh(setup_kms["url"])
    refresh(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
            kid=refresh_json["kid"]
        )
        if status_code != 202:
            break
    assert status_code == 200
    assert key_json["wrappedKid"].endswith("_1")


# Test fmt parameter


def test_key_fmt_tink(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    refresh(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
            fmt="tink",
        )
        if status_code != 202:
            break
    assert status_code == 200
    assert key_json["wrapped"] != ""


@pytest.mark.xfail(strict=True)
def test_key_fmt_jwk(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    refresh(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
            fmt="jwk",
        )
        if status_code != 202:
            break
    assert status_code == 200
    assert key_json["wrapped"] != ""


def test_key_fmt_invalid(setup_kms):
    apply_kms_constitution(setup_kms["url"])
    apply_key_release_policy(setup_kms["url"])
    refresh(setup_kms["url"])
    while True:
        status_code, key_json = key(
            kms_url=setup_kms["url"],
            attestation=setup_kms["attestation"],
            wrapping_key=setup_kms["wrappingKey"],
            fmt="invalid",
        )
        if status_code != 202:
            break
    assert status_code == 400


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])