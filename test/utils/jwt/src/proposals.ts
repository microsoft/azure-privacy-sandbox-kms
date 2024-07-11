// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs";
import * as Keys from "./keys";

export const issuer = "http://Demo-jwt-issuer";

export const issuerProposal = async (
  host: string,
  proposalsPath: string,
): Promise<void> => {
  // jwt issuer proposal documentation https://microsoft.github.io/CCF/main/build_apps/auth/jwt.html
  const jwtIssuerProposal = {
    actions: [
      {
        name: "set_jwt_issuer",
        args: {
          issuer: issuer,
          key_filter: "all",
          auto_refresh: false,
        },
      },
      {
        name: "set_jwt_public_signing_keys",
        args: {
          issuer: issuer,
          jwks: `${host}/keys`,
        },
      },
    ],
  };

  // save the proposal
  fs.writeFileSync(
    `${proposalsPath}/set_jwt_issuer_test_proposal.json`,
    JSON.stringify(jwtIssuerProposal),
  );
};

export const issuerConfiguration = async (
  privateKeyPath: string,
  certPath: string,
  proposalsPath: string,
  kid: string,
): Promise<void> => {
  const jwk = Keys.getJwks(privateKeyPath, certPath, kid);
  const payload = {
    issuer,
    jwks: { keys: [jwk] },
  };
  // save the configuration to file
  fs.writeFileSync(
    `${proposalsPath}/set_jwt_issuer_test_sandbox.json`,
    JSON.stringify(payload),
  );
};
