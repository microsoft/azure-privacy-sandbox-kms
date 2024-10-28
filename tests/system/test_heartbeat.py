import pytest
from endpoints import heartbeat


@pytest.mark.xfail(strict=True) # TODO: Fix #168
def test_heartbeat(setup_kms):
    status_code, heartbeat_json = heartbeat(setup_kms["url"])
    assert status_code == 200

    # TODO: Check the shape of heartbeat response


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
