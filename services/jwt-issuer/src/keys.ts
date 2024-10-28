// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import crypto from "crypto";
import fs from "fs";
import { Extras, JWK, pem2jwk } from "pem-jwk";
import forge from "node-forge";

// Save a new keys in the presented by path
export const generate = async (
  privateKeyPath: string,
  certPath: string,
): Promise<void> => {
  try {
    const keys = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });

    // Create a self-signed certificate
    const cert = forge.pki.createCertificate();
    const attrs = [{ name: "commonName", value: "Test" }];
    cert.setIssuer(attrs);
    cert.publicKey = forge.pki.publicKeyFromPem(keys.publicKey);
    cert.sign(
      forge.pki.privateKeyFromPem(keys.privateKey),
      forge.md.sha256.create(),
    );
    const certDer = forge.asn1
      .toDer(forge.pki.certificateToAsn1(cert))
      .getBytes();
    const certDerB64 = forge.util.encode64(certDer);
    fs.writeFileSync(certPath, certDerB64);

    fs.writeFileSync(privateKeyPath, keys.privateKey);
  } catch (error) {
    console.error("An error occurred:", error);
  }
  console.log(`Cert saved: ${certPath}`);
  console.log(`Private key saved: ${privateKeyPath}`);
};

export const getJwks = (
  privateKeyPathpath: string,
  certPath: string,
  kid: string,
): JWK<Extras> => {
  const privateKey = fs.readFileSync(privateKeyPathpath, "utf8");
  console.log(`Get privatekey: ${privateKey}`);
  const jwk = pem2jwk(privateKey);
  const pem = fs.readFileSync(certPath, "utf8");

  // Remove private key
  delete jwk.d;
  delete jwk.dq;
  delete jwk.dp;
  delete jwk.p;
  delete jwk.q;
  delete jwk.qi;
  (<any>jwk).x5c = [pem];
  (<any>jwk).kid = kid;
  return jwk;
};
