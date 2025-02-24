import os
import pytest
import tempfile

from utils import apply_kms_constitution, propose, get_test_action, get_test_proposal

@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_constitution_auto_accept(setup_kms):
    with get_test_action() as action_file:
        apply_kms_constitution(actions=action_file.name)

    with get_test_proposal() as proposal_file:
        proposal_response = propose(proposal_file.name, get_logs=True)
        assert proposal_response["state"] == "Accepted"


@pytest.mark.xfail(
    os.getenv("TEST_ENVIRONMENT") == "ccf/acl",
    strict=True,
    reason="Governance operations need to move to user endpoints",
)
def test_constitution_majority_vote(setup_kms):
    with get_test_action() as action_file:
        apply_kms_constitution(resolve="majority_vote", actions=action_file.name)

    with get_test_proposal() as proposal_file:
        proposal_response = propose(proposal_file.name, get_logs=True)
        assert proposal_response["state"] == "Open"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
