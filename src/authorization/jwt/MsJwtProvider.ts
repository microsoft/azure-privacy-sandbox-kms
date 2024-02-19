import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";
import { JwtValidationPolicyMap } from "./JwtValidationPolicyMap";

/**
 * MS Access Token
 */
export interface MSAccessToken {
  sub: string;
  iss: string;
  aud: string;
  appid: string;
  ver: string;
}
export const authorizeJwt = (
  issuer: string,
  identity: ccfapp.JwtAuthnIdentity,
): ServiceResult<string> => {
  const policy = JwtValidationPolicyMap.read(issuer);
  const keys = Object.keys(policy);

  for (let inx = 0; inx < keys.length; inx++) {
    const key = keys[inx];
    const jwtProp = identity?.jwt?.payload[key];
    const compliant = jwtProp === policy[key];
    console.log(
      `isValidJwtToken: ${key}, expected: ${policy[key]}, found: ${jwtProp}, ${compliant}`,
    );
    if (!compliant) {
      const errorMessage = `The JWT has no valid ${key}, expected: ${policy[key]}, found: ${jwtProp}`;
      return ServiceResult.Failed(
        { errorMessage, errorType: "AuthenticationError" },
        401,
      );
    }
  }

  return ServiceResult.Succeeded("");
};

export class MsJwtProvider implements IJwtIdentityProvider {
  constructor(public name) {}

  /**
   * Check if caller's access token is valid
   * @param {JwtAuthnIdentity} identity JwtAuthnIdentity object
   * @returns {ServiceResult<string>}
   */
  public isValidJwtToken(
    identity: ccfapp.JwtAuthnIdentity,
  ): ServiceResult<string> {
    const msClaims = identity.jwt.payload as MSAccessToken;

    const issuer = identity?.jwt?.payload?.iss;
    if (!issuer) {
      return ServiceResult.Failed(
        {
          errorMessage: "The JWT has no valid iss",
          errorType: "AuthenticationError",
        },
        400,
      );
    }

    const isAuthorized = authorizeJwt(issuer, identity);
    if (!isAuthorized.success) {
      return isAuthorized;
    }

    const identityId = identity?.jwt?.payload?.sub;
    return ServiceResult.Succeeded(identityId);
  }
}
