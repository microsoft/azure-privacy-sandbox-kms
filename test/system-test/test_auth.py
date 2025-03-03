import os
import pytest
from endpoints import auth
from utils import apply_kms_constitution, trust_jwt_issuer


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_auth_member_cert(setup_kms):
    status_code, auth_json = auth(auth="member_cert")
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "member_cert"

@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_auth_jwt(setup_kms, setup_jwt_issuer):
    apply_kms_constitution()
    trust_jwt_issuer()
    status_code, auth_json = auth(auth="jwt")
    assert status_code == 200
    assert auth_json["auth"]["policy"] == "jwt"



if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])
