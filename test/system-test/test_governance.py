import os
import pytest

from utils import add_member, create_member, member_info


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_add_member(setup_kms):
    member_name = "test-new-member"
    create_member(member_name)
    add_member(member_name)
    member = member_info(member_name)
    assert member['status'] == "Active"

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
