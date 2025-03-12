import os
import pytest
from endpoints import auth
from utils import apply_kms_constitution, trust_jwt_issuer


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="ACL doesn't support CCF members",
)
def test_auth_member_cert(setup_kms):
    status_code, auth_json = auth(auth="member_cert")
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "member_cert"

def test_auth_user_cert(setup_kms):
    status_code, auth_json = auth(auth="user_cert")
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "user_cert"

@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="ACL doesn't support setting custom JWT issuers",
)
def test_auth_demo_jwt(setup_kms, setup_demo_jwt_issuer):
    apply_kms_constitution()
    trust_jwt_issuer("demo")
    status_code, auth_json = auth(auth="jwt")
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "jwt"
    assert auth_json["auth"]["jwt"]["keyIssuer"] == "http://Demo-jwt-issuer"

def test_auth_aad_jwt(setup_kms, setup_aad_jwt_issuer):
    apply_kms_constitution()
    trust_jwt_issuer("aad")
    status_code, auth_json = auth(auth="jwt")
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "jwt"
    assert "https://login.microsoftonline.com" in auth_json["auth"]["jwt"]["keyIssuer"]



if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
