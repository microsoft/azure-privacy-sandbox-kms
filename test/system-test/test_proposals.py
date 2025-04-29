import json
from time import sleep
from endpoints import proposalsGet
from utils import apply_key_release_policy, apply_settings_policy
from cose.messages import CoseMessage


def test_proposals(setup_kms):
    status_code, proposals_json = proposalsGet()
    assert status_code == 200

    # There is always one proposal to set the JWT validation policy
    assert len(proposals_json) == 1
    jwt_validation_proposal_cose = CoseMessage.decode(bytes.fromhex(proposals_json[0]))
    jwt_validation_proposal_json = json.loads(jwt_validation_proposal_cose.payload)
    assert jwt_validation_proposal_json["actions"][0]["name"] == "set_jwt_validation_policy"


def test_proposals_multiple(setup_kms):
    status_code, proposals_json = proposalsGet()
    assert status_code == 200
    assert len(proposals_json) == 1

    # Sleep to ensure that the proposal timestamps are different so they're ordered correctly
    sleep(2)

    # Make a second proposal
    apply_key_release_policy()

    # Check we recieve the expected proposal
    status_code, proposals_json = proposalsGet()
    assert status_code == 200
    assert len(proposals_json) == 2
    key_release_policy_cose = CoseMessage.decode(bytes.fromhex(proposals_json[1]))
    key_release_policy_json = json.loads(key_release_policy_cose.payload)
    assert key_release_policy_json["actions"][0]["name"] == "set_key_release_policy"


def test_proposals_caps_to_five(setup_kms):
    status_code, proposals_json = proposalsGet()
    assert status_code == 200
    assert len(proposals_json) == 1

    # Make a five more proposals, taking the total to six
    for i in range(5):
        sleep(2) # Ensures the proposal timestamps are different
        apply_settings_policy({
            "service": {
                "name": "test-kms",
                "description": "Custom Key Management Service",
                "version": f"0.0.{i}",
                "debug": True,
            }
        })

    # Check we only have 5 proposals returned
    status_code, proposals_json = proposalsGet()
    assert status_code == 200
    assert len(proposals_json) == 5

    # The proposals should be in order
    for idx, proposal_bytes in enumerate(proposals_json):
        proposal_cose = CoseMessage.decode(bytes.fromhex(proposal_bytes))
        proposal_json = json.loads(proposal_cose.payload)
        assert proposal_json["actions"][0]["name"] == "set_settings_policy", "All recent proposals should be set_settings_policy"
        assert proposal_json["actions"][0]["args"]["settings_policy"]["service"]["version"] == f"0.0.{idx}", "Proposals are out of the expected order"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])