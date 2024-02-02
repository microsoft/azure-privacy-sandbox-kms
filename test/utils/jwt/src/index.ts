// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import express from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import { Request, Response } from "express";
import crypto from "crypto";
import * as Keys from "./keys";
import * as Proposals from "./proposals";

const proposalsPath = `${process.env.WORKSPACE}/proposals`;
const privateKeyPath = `${process.env.WORKSPACE}/private.pem`;
const certificatePath = `${process.env.WORKSPACE}/cert.pem`;
const kid = "Demo IDP kid";
const hostPort = 3000;
const host = `http://localhost:${hostPort}`;

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

// Use POST simular as AAD. No body required.
app.post("/token", (req: Request, res: Response) => {
  const payload = {
    sub: crypto.randomUUID(),
    name: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // expires in 1 hour
  };

  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  res.send({ token });
});

// Get the public key metadata.
app.get("/keys", (req: Request, res: Response) => {
  const jwk = Keys.getJwks(privateKeyPath, certificatePath, kid);
  res.send({ keys: [jwk] });
});

app.listen(hostPort, () =>
  console.log(`JWT Issuer started on port ${hostPort}`),
);
