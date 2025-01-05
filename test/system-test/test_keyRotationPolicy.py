import pytest
from endpoints import key, refresh
from utils import apply_kms_constitution, apply_key_release_policy, trust_jwt_issuer, get_test_attestation, get_test_wrapping_key
from datetime import datetime, timedelta

def test_key_in_grace_period(setup_kms):
    """
    Test the key retrieval during the grace period.
    Simulates the key being in the grace period by manipulating the key's timestamp.
    """
    apply_kms_constitution()
    apply_key_release_policy()
    refresh()
    while True:
        status_code, key_json = key(
            attestation=get_test_attestation(),
            wrapping_key=get_test_wrapping_key(),
        )
        if status_code != 202:
            break
    assert status_code == 200

    # Simulate key being in the grace period by manipulating the key's timestamp
    key_id = key_json["wrappedKid"]
    key_item = hpkeKeysMap.store.get(key_id)
    interval_period_seconds = 300  # Interval period in seconds
    grace_period_seconds = 60  # Grace period in seconds
    # Set the key's timestamp to be within the grace period
    key_item.timestamp = (datetime.utcnow() - timedelta(seconds=interval_period_seconds - grace_period_seconds + 30)).isoformat() + "Z"
    hpkeKeysMap.store.set(key_id, key_item)

    # Attempt to retrieve the key again
    status_code, key_json = key(
        attestation=get_test_attestation(),
        wrapping_key=get_test_wrapping_key(),
    )
    assert status_code == 200
    assert key_json["wrappedKid"] != ""
    assert key_json["wrapped"] == ""

def test_key_expired(setup_kms):
    """
    Test the key retrieval after the key has expired.
    Simulates the key being expired by manipulating the key's timestamp.
    """
    apply_kms_constitution()
    apply_key_release_policy()
    refresh()
    while True:
        status_code, key_json = key(
            attestation=get_test_attestation(),
            wrapping_key=get_test_wrapping_key(),
        )
        if status_code != 202:
            break
    assert status_code == 200

    # Simulate key being expired by manipulating the key's timestamp
    key_id = key_json["wrappedKid"]
    key_item = hpkeKeysMap.store.get(key_id)
    interval_period_seconds = 300  # Interval period in seconds
    key_item.timestamp = (datetime.utcnow() - timedelta(seconds=interval_period_seconds + 30)).isoformat() + "Z"
    hpkeKeysMap.store.set(key_id, key_item)

    # Attempt to retrieve the key again
    status_code, key_json = key(
        attestation=get_test_attestation(),
        wrapping_key=get_test_wrapping_key(),
    )
    assert status_code == 400

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
