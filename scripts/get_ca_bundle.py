import socket
import ssl
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

hostname = "login.microsoftonline.com"
ctx = ssl.create_default_context()

with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
    s.connect((hostname, 443))
    ca_der = ctx.get_ca_certs(binary_form=True)[0]

# Convert from DER to PEM
ca_cert = x509.load_der_x509_certificate(ca_der, default_backend())
ca_pem = ca_cert.public_bytes(serialization.Encoding.PEM)

print(ca_pem.decode())