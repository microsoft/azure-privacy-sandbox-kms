import pytest
from endpoints import heartbeat


def test_heartbeat(setup_kms):
    status_code, heartbeat_json = heartbeat(setup_kms["url"])
    assert status_code == 200

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
