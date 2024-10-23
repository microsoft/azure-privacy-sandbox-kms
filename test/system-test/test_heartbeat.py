
from endpoints import heartbeat


def test_heartbeat(setup_kms):  # TODO: Fix #168
    status_code, heartbeat_json = heartbeat(setup_kms["url"])
    assert status_code == 200

    # TODO: Check the shape of heartbeat response

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
