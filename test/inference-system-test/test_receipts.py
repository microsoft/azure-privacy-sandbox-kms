import pytest
import json
import ccf.receipt
from hashlib import sha256
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend
from endpoints import listpubkeys, refresh

def test_validate_receipt(setup_kms):
    refresh()
    
    while True:
        status_code, pubkeys = listpubkeys()
        if status_code != 202:
            break

    assert status_code == 200

    publicKey = pubkeys[0]['publicKey']
    receipt = json.loads(pubkeys[0]['receipt'])

    print("public key to validate: ", publicKey)
    print("receipt to validate: ", json.dumps(receipt, indent=4))

    # validate receipt
    assert len(receipt['signature']) > 0
    assert "leaf_components" in receipt

    # In order to calculate the leaf value we need to hash all leaf_components
    write_set_digest = bytes.fromhex(receipt["leaf_components"]["write_set_digest"])
    claims_digest = bytes.fromhex(receipt["leaf_components"]["claims_digest"])
    assert len(receipt['signature']) >= 100

    commit_evidence_digest = sha256(
        receipt["leaf_components"]["commit_evidence"].encode()
    ).digest()
    leaf = (
        sha256(write_set_digest + commit_evidence_digest + claims_digest)
            .digest()
            .hex()
        )
    
    # Get the root of the merkle tree
    root = ccf.receipt.root(leaf, receipt["proof"])

    # Get the certificate from the payload. Needs to be endorsed
    node_cert = load_pem_x509_certificate(receipt["cert"].encode(), default_backend())

    # Verify the merkle tree signature
    ccf.receipt.verify(root, receipt["signature"], node_cert)

    # get claims digest
    claims = publicKey.encode()
    claims_digest = sha256(claims).digest().hex()
    
    # validate claims digest
    assert claims_digest == receipt["leaf_components"]["claims_digest"]
    
if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-s"])