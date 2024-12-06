import json
import pytest
import tempfile

from utils import apply_kms_constitution, propose

test_action="""
    actions.set(
        "test_action",
        new Action(function (args) {}, function (args) {}),
    );
"""

test_proposal=json.dumps({
    "actions": [
        {
            "name": "test_action",
            "args": {}
        }
    ]
})

def test_constitution_auto_accept(setup_kms):
    with tempfile.NamedTemporaryFile(mode="w+") as action_file:
        action_file.write(test_action)
        action_file.flush()
        apply_kms_constitution(actions=action_file.name)

    with tempfile.NamedTemporaryFile(mode="w+", prefix="test_proposal") as proposal_file:
        proposal_file.write(test_proposal)
        proposal_file.flush()
        proposal_response = propose(proposal_file.name, get_logs=True)
        assert proposal_response["state"] == "Accepted"


def test_constitution_majority_vote(setup_kms):
    with tempfile.NamedTemporaryFile(mode="w+") as action_file:
        action_file.write(test_action)
        action_file.flush()
        apply_kms_constitution(resolve="majority_vote", actions=action_file.name)

    with tempfile.NamedTemporaryFile(mode="w+", prefix="test_proposal") as proposal_file:
        proposal_file.write(test_proposal)
        proposal_file.flush()
        proposal_response = propose(proposal_file.name, get_logs=True)
        assert proposal_response["state"] == "Open"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, '-s'])
