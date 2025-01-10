import json
import pytest
from endpoints import key, refresh, unwrapKey
from utils import apply_kms_constitution, apply_key_release_policy, trust_jwt_issuer, get_test_attestation, get_test_public_wrapping_key, decrypted_wrapped_key, apply_settings_policy


def unwrap_key_and_decrypt(setup_kms):
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
        wrapped=key_json["wrapped"],
        wrappedKid=key_json["wrappedKid"]
    )
    assert status_code == 200
    unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
    unwrapped_json = json.loads(unwrapped)
    print(unwrapped_json)
    assert unwrapped_json["kty"] == "OKP"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])