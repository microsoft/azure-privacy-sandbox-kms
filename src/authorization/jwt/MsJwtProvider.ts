import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";
import { JwtValidationPolicyMap } from "./JwtValidationPolicyMap";
import { Logger, LogContext } from "../../utils/Logger";

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
  logContextIn?: LogContext
): ServiceResult<string> => {
  const logContext = (logContextIn?.clone() || new LogContext()).appendScope("authorizeJwt");
  const policy = JwtValidationPolicyMap.read(issuer, logContext);
  if (policy === undefined) {
    const errorMessage = `issuer ${issuer} is not defined in the policy`;
    Logger.error(errorMessage, logContext);
    return ServiceResult.Failed(
      {
        errorMessage,
        errorType: "AuthenticationError",
      },
      401,
      logContext
    );
  }
  Logger.debug(
    `Validate JWT policy for issuer ${issuer}: ${JSON.stringify(policy)}`, logContext
  );

  Logger.info(
    `Validate JWT policy for issuer ${issuer}: ${JSON.stringify(policy)}`, logContext
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

    Logger.debug(
      `isValidJwtToken: ${key}, expected: ${policy[key]}, found: ${jwtProp}, ${compliant}`, logContext
    );

    if (!compliant) {
      const errorMessage = `The JWT has no valid ${key}, expected: ${policy[key]}, found: ${jwtProp}`;
      Logger.error(errorMessage, logContext);
      return ServiceResult.Failed(
        { errorMessage, errorType: "AuthenticationError" },
        401,
        logContext
      );
    }
  }

  return ServiceResult.Succeeded("", logContext);
};

export class MsJwtProvider implements IJwtIdentityProvider {
  private logContext: LogContext;

  constructor(public name: string, logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("MsJwtProvider");
  }

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
        this.logContext
      );
    }

    const isAuthorized = authorizeJwt(issuer, identity, this.logContext);
    if (!isAuthorized.success) {
      return isAuthorized;
    }

    const identityId = identity?.jwt?.payload?.sub;
    return ServiceResult.Succeeded(identityId, this.logContext);
  }
}
