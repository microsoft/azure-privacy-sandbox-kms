import json
from endpoints import proposalsGet
from utils import apply_settings_policy
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

    # Make a second proposal
    apply_settings_policy()

    # Check we recieve the expected proposal
    status_code, proposals_json = proposalsGet()
    assert status_code == 200
    assert len(proposals_json) == 2
    key_release_policy_cose = CoseMessage.decode(bytes.fromhex(proposals_json[1]))
    key_release_policy_json = json.loads(key_release_policy_cose.payload)
    assert key_release_policy_json["actions"][0]["name"] == "set_key_release_policy"




if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])