import os
import pytest

from utils import add_member, create_member, apply_kms_constitution, member_info, use_member, vote


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

@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_add_member_with_voting(setup_kms):
    apply_kms_constitution(resolve="majority_vote")
    member_name = "test-new-member"
    create_member(member_name)
    add_member(member_name)
    assert member_info(member_name)["status"] == "Open"
    vote(member_info(member_name)["proposalId"], "accept")
    assert member_info(member_name)["status"] == "Accepted"

@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_use_member(setup_kms):
    member_name = "test-new-member"
    create_member(member_name)
    add_member(member_name)
    use_member(member_name)
    constitution_proposal = apply_kms_constitution(get_logs=True)
    assert constitution_proposal['proposer_id'] == member_info(member_name)["memberId"]

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
