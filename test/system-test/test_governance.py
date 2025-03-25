import os
import pytest

from utils import add_member, member_info, use_member, apply_settings_policy


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_add_member(setup_kms):
    member_name = "test-new-member"
    add_member(member_name)
    member = member_info(member_name)
    assert member['status'] == "Active"

@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_use_member(setup_kms):
    member_name = "test-new-member"
    add_member(member_name)
    use_member(member_name)
    proposal = apply_settings_policy(get_logs=True)
    assert proposal['proposer_id'] == member_info(member_name)["memberId"]

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
