// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import express from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import { Request, Response } from "express";
import crypto from "crypto";
import * as Keys from "./keys";
import * as Proposals from "./proposals";

const proposalsPath = `${process.env.KMS_WORKSPACE}/proposals`;
const privateKeyPath = `${process.env.KMS_WORKSPACE}/private.pem`;
const certificatePath = `${process.env.KMS_WORKSPACE}/cert.pem`;
const kid = "Demo IDP kid";
const hostPort = 3000;
const host = `http://localhost:${hostPort}`;
const iss = "http://Demo-jwt-issuer";
const sub = "c0d8e9a7-6b8e-4e1f-9e4a-3b2c1d0f5a6b";
const name = "Cool caller";
const expiry = 1000;

const createProposalsFolder = async (): Promise<void> => {
  console.log(`Create proposals path: ${proposalsPath}`);
  // make sure the proposals folder exists.
  await fs.promises
    .mkdir(proposalsPath, { recursive: true })
    .catch(console.error);
};

(async () => {
  // Generate private key and proposals if needed
  console.log(`Check for IDP private key path: ${privateKeyPath}`);
  if (!fs.existsSync(privateKeyPath)) {
    console.log(`Generate IDP private key path: ${privateKeyPath}`);
    await Keys.generate(privateKeyPath, certificatePath);

    // Create folders
    await createProposalsFolder();

    // generate issuer proposal
    await Proposals.issuerProposal(host, proposalsPath);

    // generate issuer configuration used in sandbox
    await Proposals.issuerConfiguration(
      host,
      privateKeyPath,
      certificatePath,
      proposalsPath,
      kid,
    );
  }
})();

const app = express();
let privateKey = fs.readFileSync(privateKeyPath);
const token = (req: Request, res: Response) => {
  const payload = {
    iss,
    sub,
    name,
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // expires in 1 hour
  };

  const access_token = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    keyid: kid,
  });
  res.send({
    token_type: "bearer",
    expires_in: `${expiry}`,
    access_token,
  });
};

// Use POST simular as AAD. No body required.
app.post("/token", token);

// Endpoint for managed identities.
app.get("/metadata/identity/oauth2/token", token);

// Get the public key metadata.
app.get("/keys", (req: Request, res: Response) => {
  const jwk = Keys.getJwks(privateKeyPath, certificatePath, kid);
  res.send({ keys: [jwk] });
});

app.listen(hostPort, () =>
  console.log(`JWT Issuer started on port ${hostPort}`),
);
