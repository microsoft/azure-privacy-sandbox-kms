from endpoints import refresh


def test_single_refresh(setup_kms):
    status_code, refresh_json = refresh()
    assert status_code == 200


def test_multiple_refresh(setup_kms):
    status_code, refresh_json = refresh()
    assert status_code == 200
    first_kid = refresh_json["kid"]

    status_code, refresh_json = refresh()
    assert status_code == 200
    second_kid = refresh_json["kid"]

    assert first_kid != second_kid


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
