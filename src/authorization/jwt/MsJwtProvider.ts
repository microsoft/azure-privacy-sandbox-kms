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

/**
 * Validate the JWT token
 * @param issuer name of the issuer
 * @param identity used to validate the JWT token
 * @returns
 */
export const authorizeJwt = (
  issuer: string,
  identity: ccfapp.JwtAuthnIdentity,
): ServiceResult<string> => {
  const policy = JwtValidationPolicyMap.read(issuer);
  if (policy === undefined) {
    const errorMessage = `issuer ${issuer} is not defined in the policy`;
    console.error(errorMessage);
    return ServiceResult.Failed(
      {
        errorMessage,
        errorType: "AuthenticationError",
      },
      500,
    );
  }

  console.log(
    `Validate JWT policy for issuer ${issuer}: ${JSON.stringify(policy)}`,
  );
  const keys = Object.keys(policy);

  for (let inx = 0; inx < keys.length; inx++) {
    const key = keys[inx];
    const jwtProp = identity?.jwt?.payload[key];
    let compliant = false;

    // Check if policy[key] is an array
    if (Array.isArray(policy[key])) {
      // Check if jwtProp is in the array
      compliant = policy[key].includes(jwtProp);
    } else {
      // Perform the existing equality check
      compliant = jwtProp === policy[key];
    }

    console.log(
      `isValidJwtToken: ${key}, expected: ${policy[key]}, found: ${jwtProp}, ${compliant}`,
    );

    if (!compliant) {
      const errorMessage = `The JWT has no valid ${key}, expected: ${policy[key]}, found: ${jwtProp}`;
      console.error(errorMessage);
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
