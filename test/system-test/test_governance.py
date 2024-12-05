import pytest

from utils import add_member, apply_kms_constitution, member_info, use_member


def test_add_member(setup_kms):
    member_name = "test-new-member"
    add_member(member_name)
    member = member_info(member_name)
    assert member['status'] == "Active"

def test_add_member_with_voting(setup_kms):
    ...

def test_use_member(setup_kms):
    member_name = "test-new-member"
    add_member(member_name)
    use_member(member_name)
    constitution_proposal = apply_kms_constitution(get_logs=True)
    assert constitution_proposal['proposer_id'] == member_info(member_name)["memberId"]

if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])