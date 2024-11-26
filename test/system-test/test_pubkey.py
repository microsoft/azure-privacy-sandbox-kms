import pytest
from endpoints import pubkey, refresh


@pytest.mark.xfail(strict=True) # TODO: Fix #167
def test_no_params_no_keys(setup_kms):
    status_code, key_json = pubkey()
    assert status_code == 200


def test_no_params_with_single_key(setup_kms):
    refresh()
    while True:
        status_code, key_json = pubkey()
        if status_code != 202:
            break
    assert status_code == 200
    assert key_json["id"] == 11


def test_no_params_with_multiple_keys(setup_kms):
    refresh()
    refresh()
    while True:
        status_code, key_json = pubkey()
        if status_code != 202:
            break
    assert status_code == 200
    assert key_json["id"] == 12


def test_kid_not_present_with_other_keys(setup_kms):
    refresh()
    while True:
        status_code, key_json = pubkey(kid = "doesntexist")
        if status_code != 202:
            break
    assert status_code == 404


def test_kid_not_present_without_other_keys(setup_kms):
    while True:
        status_code, key_json = pubkey(kid = "doesntexist")
        if status_code != 202:
            break
    assert status_code == 404


def test_kid_present(setup_kms):
    _, refresh_json = refresh()
    while True:
        status_code, key_json = pubkey(kid = refresh_json["kid"])
        if status_code != 202:
            break
    assert status_code == 200


def test_fmt_tink(setup_kms):
    refresh()
    while True:
        status_code, key_json = pubkey(fmt="tink")
        if status_code != 202:
            break
    try:
        keys = key_json["key"]
        key = keys[0]
        keyData = key["keyData"]
    except KeyError:
        raise Exception("Key doesn't match tink format")
    assert status_code == 200
    assert (
        "status" in key and \
        "outputPrefixType" in key and \
            "typeUrl" in keyData and \
            "value" in keyData and \
            "keyMaterialType" in keyData
    ), "Key doesn't match tink format"


def test_fmt_jwk(setup_kms):
    refresh()
    while True:
        status_code, key_json = pubkey(fmt="jwk")
        if status_code != 202:
            break
    assert status_code == 200
    assert "crv" in key_json
    assert "kty" in key_json
    assert "x" in key_json


def test_fmt_invalid(setup_kms):
    refresh()
    while True:
        status_code, key_json = pubkey(fmt="invalid_fmt")
        if status_code != 202:
            break
    assert status_code == 400


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
