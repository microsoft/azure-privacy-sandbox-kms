// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { JwtValidationPolicyMap } from "./JwtValidationPolicyMap";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";

const errorType = "AuthenticationError";

export class DemoJwtProvider implements IJwtIdentityProvider {
  constructor(public name: string) {}

  /**
   * Check if caller's access token is valid
   * @param {JwtAuthnIdentity} identity JwtAuthnIdentity object
   * @returns {ServiceResult<string>}
   */
  public isValidJwtToken(
    identity: ccfapp.JwtAuthnIdentity,
  ): ServiceResult<string> {
    const issuer = identity?.jwt?.payload?.iss;
    if (!issuer) {
      return ServiceResult.Failed({
        errorMessage: "The JWT has no valid iss",
        errorType,
      });
    }
    const policy = JwtValidationPolicyMap.read(issuer);
    const keys = Object.keys(policy);

    for(let inx = 0; inx < keys.length; inx++) {
      const key = keys[inx];
      const jwtProp = identity?.jwt?.payload[key];
      const compliant = (jwtProp === policy[key]);
      console.log(`DemoJwtProvider.isValidJwtToken: ${key}, expected: ${policy[key]}, found: ${jwtProp}, ${compliant}`);
      if ( !compliant ) {
        const errorMessage = `The JWT has no valid ${key}, expected: ${policy[key]}, found: ${jwtProp}`;
        return ServiceResult.Failed({errorMessage, errorType });
      }
    }

    const identityId = identity?.jwt?.payload?.sub;
    console.log(`JWT validation succeeded: ${identityId}`)
    return ServiceResult.Succeeded(identityId);
  }
}
