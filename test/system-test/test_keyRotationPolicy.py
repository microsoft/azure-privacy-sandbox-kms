import json
import os
import pytest
import time
from endpoints import key, refresh
from utils import (
    apply_settings_policy,
    apply_key_release_policy,
    apply_key_rotation_policy,
    get_test_attestation,
    get_test_public_wrapping_key,
    decrypted_wrapped_key,
    call_endpoint,
)


# Test the key retrieval during the grace period with key rotation policy.
def test_key_in_grace_period_with_rotation_policy(setup_kms):
    policy = {
        "service": {
            "name": "custom-kms",
            "description": "Custom Key Management Service",
            "version": "2.0.0",
            "debug": True,
        }
    }
    apply_settings_policy(policy)
    apply_key_release_policy()
    apply_key_rotation_policy()
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
    status_code, unwrapped_json = call_endpoint(fr"""
        scripts/kms/endpoints/unwrapKey.sh \
            --attestation "$(cat test/attestation-samples/snp.json)" \
            --wrapping-key "$(sed ':a;N;$!ba;s/\n/\\n/g' test/data-samples/publicWrapKey.pem)" \
            --wrappedKid "{key_json["wrappedKid"]}"
    """)
    assert status_code == 200
    unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
    unwrapped_json = json.loads(unwrapped)
    print(unwrapped_json)
    assert unwrapped_json["kty"] == "OKP"
    assert unwrapped_json.get("expiry") is not None

# Test the key retrieval during the grace period without key rotation policy.
def test_key_in_grace_period_without_rotation_policy(setup_kms):
    apply_key_release_policy()
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
    status_code, unwrapped_json = call_endpoint(fr"""
        scripts/kms/endpoints/unwrapKey.sh \
            --attestation "$(cat test/attestation-samples/snp.json)" \
            --wrapping-key "$(sed ':a;N;$!ba;s/\n/\\n/g' test/data-samples/publicWrapKey.pem)" \
            --wrappedKid "{key_json["wrappedKid"]}"
    """)
    assert status_code == 200
    unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
    unwrapped_json = json.loads(unwrapped)
    print(unwrapped_json)
    assert unwrapped_json["kty"] == "OKP"
    assert unwrapped_json.get("expiry") is None

# Test the key retrieval during with custom key rotation policy.
def test_key_in_grace_period_with_custom_rotation_policy(setup_kms):
    apply_settings_policy()
    apply_key_release_policy()
    apply_key_rotation_policy()
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
    status_code, unwrapped_json = call_endpoint(fr"""
        scripts/kms/endpoints/unwrapKey.sh \
            --attestation "$(cat test/attestation-samples/snp.json)" \
            --wrapping-key "$(sed ':a;N;$!ba;s/\n/\\n/g' test/data-samples/publicWrapKey.pem)" \
            --wrappedKid "{key_json["wrappedKid"]}"
    """)
    assert status_code == 200
    unwrapped = decrypted_wrapped_key(unwrapped_json["wrapped"])
    unwrapped_json = json.loads(unwrapped)
    assert unwrapped_json["kty"] == "OKP"
    assert unwrapped_json.get("expiry") is not None
    policy = {
        "actions": [
            {
                "name": "set_key_rotation_policy",
                "args": {
                    "key_rotation_policy": {
                        "rotation_interval_seconds": 10,
                        "grace_period_seconds": 5,
                    }
                },
            }
        ]
    }
    apply_key_rotation_policy(policy)
    status_code, unwrapped_json = call_endpoint(fr"""
        scripts/kms/endpoints/unwrapKey.sh \
            --attestation "$(cat test/attestation-samples/snp.json)" \
            --wrapping-key "$(sed ':a;N;$!ba;s/\n/\\n/g' test/data-samples/publicWrapKey.pem)" \
            --wrappedKid "{key_json["wrappedKid"]}"
    """)
    assert status_code == 200

    # wait for the key to expire
    time.sleep(20)
    status_code, unwrapped_json = call_endpoint(fr"""
        scripts/kms/endpoints/unwrapKey.sh \
            --attestation "$(cat test/attestation-samples/snp.json)" \
            --wrapping-key "$(sed ':a;N;$!ba;s/\n/\\n/g' test/data-samples/publicWrapKey.pem)" \
            --wrappedKid "{key_json["wrappedKid"]}"
    """)
    assert status_code == 410  # check for expired key


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-s"])
