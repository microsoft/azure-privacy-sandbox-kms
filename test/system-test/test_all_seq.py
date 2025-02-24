import json
import os
import pytest
from endpoints import heartbeat, key, listpubkeys, pubkey, keyReleasePolicy, unwrapKey, refresh
from utils import get_test_attestation, get_test_public_wrapping_key, apply_kms_constitution, apply_key_release_policy, decrypted_wrapped_key, trust_jwt_issuer, remove_key_release_policy

# These tests run on a single KMS instance in order to be cheaper regarding
# Azure deployments.

# Since the KMS is a stateful system, running certain tests will have side
# effects which affects the behaviour for other tests.

# Therefore, the order of the tests is important and changing the order will
# likely break tests

# To make this clearer, test names will include the expected state of the KMS

# def test_no_policy_no_keys_no_jwt_heartbeat(setup_kms_session):
#     status_code, heartbeat_json = heartbeat()
#     assert status_code == 200
#     assert heartbeat_json["status"] == "Service is running"


# @pytest.mark.xfail(strict=True) # TODO: Fix, see #167
# def test_no_policy_no_keys_no_jwt_listpubkeys(setup_kms_session):
#     status_code, pubkeys = listpubkeys()
#     assert status_code == 200
#     assert len(pubkeys["keys"]) == 0


# @pytest.mark.xfail(strict=True) # TODO: Fix #167
# def test_no_policy_no_keys_no_jwt_pubkey(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey()
#         if status_code != 202:
#             break
#     assert status_code == 404


# def test_no_policy_no_keys_no_jwt_pubkey_with_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(kid="doesntexist")
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(strict=True) # TODO: Fix #167
# def test_no_policy_no_keys_no_jwt_key(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#         )
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(strict=True) # TODO: Fix #167
# def test_no_policy_no_keys_no_jwt_unwrapKey(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             wrappedKid="doesntexist",
#         )
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(strict=True) # TODO: Fix #175
# def test_no_policy_no_keys_no_jwt_keyReleasePolicy(setup_kms_session):
#     status_code, key_release_json = keyReleasePolicy()
#     assert status_code == 200


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_no_policy_no_keys_no_jwt_set_key_release_policy(setup_kms_session):
    apply_kms_constitution()
    # apply_key_release_policy()


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_no_keys_no_jwt_keyReleasePolicy(setup_kms_session):
#     status_code, key_release_json = keyReleasePolicy()
#     assert status_code == 200


# @pytest.mark.xfail(strict=True) # TODO: Fix #167
# def test_set_policy_no_keys_no_jwt_pubkey(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey()
#         if status_code != 202:
#             break
#     assert status_code == 404


# def test_set_policy_no_keys_no_jwt_pubkey_with_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(kid="doesntexist")
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(strict=True) # TODO: Fix #167
# def test_set_policy_no_keys_no_jwt_key(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#         )
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(strict=True) # TODO: Fix #167
# def test_set_policy_no_keys_no_jwt_unwrapKey(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             wrappedKid="doesntexist",
#         )
#         if status_code != 202:
#             break
#     assert status_code == 404


# def test_set_policy_no_keys_no_jwt_refresh_single(setup_kms_session):
#     status_code, refresh_json = refresh()
#     setup_kms_session["key_1_json"] = refresh_json
#     assert status_code == 200


# def test_set_policy_single_key_no_jwt_listpubkeys(setup_kms_session):
#     status_code, pubkeys = listpubkeys()
#     assert status_code == 200
#     assert len(pubkeys["keys"]) == 1


# def test_set_policy_single_key_no_jwt_pubkey(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey()
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert pubkey_json["id"] == 11


# def test_set_policy_single_key_no_jwt_pubkey_with_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(kid="doesntexist")
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_key(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200

#     # Key isn't actually returned here, just the id of a key
#     assert key_json["wrappedKid"] != ""
#     assert key_json["wrapped"] == ""


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_unwrapKey(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200

#     while True:
#         status_code, unwrapped_json = unwrapKey(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             wrappedKid=key_json["wrappedKid"],
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
#     unwrapped_json = json.loads(unwrapped)
#     print(unwrapped_json)
#     assert unwrapped_json["kty"] == "OKP"


# def test_set_policy_single_key_no_jwt_pubkey_with_invalid_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(kid = "doesntexist")
#         if status_code != 202:
#             break
#     assert status_code == 404


# def test_set_policy_single_key_no_jwt_pubkey_with_valid_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(kid = setup_kms_session["key_1_json"]["kid"])
#         if status_code != 202:
#             break
#     assert status_code == 200


# def test_set_policy_single_key_no_jwt_pubkey_fmt_tink(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(fmt="tink")
#         if status_code != 202:
#             break
#     try:
#         keys = pubkey_json["key"]
#         key = keys[0]
#         keyData = key["keyData"]
#     except KeyError:
#         raise Exception("Key doesn't match tink format")
#     assert status_code == 200
#     assert (
#         "status" in key and \
#         "outputPrefixType" in key and \
#             "typeUrl" in keyData and \
#             "value" in keyData and \
#             "keyMaterialType" in keyData
#     ), "Key doesn't match tink format"


# def test_set_policy_single_key_no_jwt_pubkey_fmt_jwk(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(fmt="jwk")
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert "crv" in pubkey_json
#     assert "kty" in pubkey_json
#     assert "x" in pubkey_json


# def test_set_policy_single_key_no_jwt_pubkey_fmt_invalid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(fmt="invalid_fmt")
#         if status_code != 202:
#             break
#     assert status_code == 400


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_key_with_invalid_kid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             kid = "doesntexist"
#         )
#         if status_code != 202:
#             break
#     assert status_code == 404


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_key_with_valid_kid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             kid = setup_kms_session["key_1_json"]["kid"]
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_key_fmt_tink(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             fmt="tink",
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert key_json["wrappedKid"] != ""


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_key_fmt_jwk(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             fmt="jwk",
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200

#     # Key isn't actually returned here, just the id of a key
#     assert key_json["wrappedKid"] != ""
#     assert key_json["wrapped"] == ""


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_key_fmt_invalid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             fmt="invalid",
#         )
#         if status_code != 202:
#             break
#     assert status_code == 400


# def test_key_valid_attestation_not_accepted(setup_kms): ...


# def test_key_incorrectly_signed_attestation(setup_kms): ...


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_no_jwt_trust_jwt_issuer(setup_kms_session, setup_jwt_issuer_session):
#     trust_jwt_issuer()


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_single_key_set_jwt_key_jwt_auth(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             auth="jwt"
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200

#     # Key isn't actually returned here, just the id of a key
#     assert key_json["wrappedKid"] != ""
#     assert key_json["wrapped"] == ""


# def test_set_policy_single_key_set_jwt_refresh_multiple(setup_kms_session):
#     status_code, refresh_json = refresh()
#     setup_kms_session["key_2_json"] = refresh_json
#     assert status_code == 200


# def test_set_policy_multiple_keys_set_jwt_listpubkeys(setup_kms_session):
#     status_code, pubkeys = listpubkeys()
#     assert status_code == 200
#     assert len(pubkeys["keys"]) == 1


# def test_set_policy_multiple_keys_set_jwt_pubkey_no_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey()
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert pubkey_json["kid"].endswith("_2")


# def test_set_policy_multiple_keys_set_jwt_pubkey_first_kid(setup_kms_session):
#     while True:
#         status_code, pubkey_json = pubkey(kid= setup_kms_session["key_1_json"]["kid"])
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert pubkey_json["kid"].endswith("_1")


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_multiple_keys_set_jwt_key_no_kid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert key_json["wrappedKid"].endswith("_2")


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_multiple_keys_set_jwt_key_first_kid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             kid= setup_kms_session["key_1_json"]["kid"],
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert key_json["wrappedKid"].endswith("_1")


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_multiple_keys_set_jwt_unwrapKey_no_kid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert key_json["wrappedKid"].endswith("_2")

#     while True:
#         status_code, unwrapped_json = unwrapKey(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             wrappedKid=key_json["wrappedKid"],
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
#     unwrapped_json = json.loads(unwrapped)
#     print(unwrapped_json)
#     assert unwrapped_json["kty"] == "OKP"


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_multiple_keys_set_jwt_unwrapKey_first_kid(setup_kms_session):
#     while True:
#         status_code, key_json = key(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             kid= setup_kms_session["key_1_json"]["kid"],
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     assert key_json["wrappedKid"].endswith("_1")

#     while True:
#         status_code, unwrapped_json = unwrapKey(
#             attestation=get_test_attestation(),
#             wrapping_key=get_test_public_wrapping_key(),
#             wrappedKid=key_json["wrappedKid"],
#         )
#         if status_code != 202:
#             break
#     assert status_code == 200
#     unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
#     unwrapped_json = json.loads(unwrapped)
#     print(unwrapped_json)
#     assert unwrapped_json["kty"] == "OKP"


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_set_policy_multiple_keys_set_jwt_unset_key_release_policy(setup_kms_session):
#     remove_key_release_policy()


# @pytest.mark.xfail(
#     os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
#     strict=True,
#     reason="Governance operations need to move to user endpoints",
# )
# def test_unset_policy_multiple_keys_set_jwt_keyReleasePolicy(setup_kms_session):
#     status_code, key_release_json = keyReleasePolicy()
#     assert status_code == 200


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
