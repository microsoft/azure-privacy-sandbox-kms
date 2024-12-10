from endpoints import auth
from utils import apply_kms_constitution, trust_jwt_issuer


def test_auth_member_cert(setup_kms):
    status_code, auth_json = auth(auth="member_cert")
    print(auth_json)
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "member_cert"


def test_auth_user_cert(setup_kms):
    status_code, auth_json = auth(auth="user_cert")
    print(auth_json)
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "user_cert"


def test_auth_jwt(setup_kms):
    apply_kms_constitution()
    trust_jwt_issuer()
    status_code, auth_json = auth(auth="jwt")
    print(auth_json)
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "jwt"


def test_auth_jwt_new_issuer(setup_kms):
    issuer = "https://new-issuer"
    apply_kms_constitution()
    trust_jwt_issuer(iss=issuer)
    status_code, auth_json = auth(auth="jwt", jwtprops=f"?iss={issuer}")
    print(auth_json)
    assert status_code == 200


def test_auth_jwt_wrong_iss(setup_kms):
    apply_kms_constitution()
    trust_jwt_issuer()
    status_code, auth_json = auth(auth="jwt", jwtprops="?iss=test")
    print(auth_json)
    assert status_code == 401



if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
