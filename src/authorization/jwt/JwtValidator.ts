// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { Logger, LogContext } from "../../utils/Logger";
import { JwtValidationPolicyMap } from "./JwtValidationPolicyMap";

export class JwtValidator implements IValidatorService {
  private logContext: LogContext;

  /**
   * Validate the JWT token
   * @param issuer name of the issuer
   * @param identity used to validate the JWT token
   * @returns
   */
  authorizeJwt(
    issuer: string,
    identity: ccfapp.JwtAuthnIdentity,
  ): ServiceResult<string> {
    const logContext = (this.logContext?.clone() || new LogContext()).appendScope("authorizeJwt");
    const policy = JwtValidationPolicyMap.read(issuer, logContext);
    if (policy === undefined) {
      const errorMessage = `issuer ${issuer} is not defined in the policy`;
      Logger.error(errorMessage, logContext);
      return ServiceResult.Failed(
        {
          errorMessage,
          errorType: "AuthenticationError",
        },
        500,
        logContext
      );
    }
    Logger.debug(
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

    const isAuthorized = this.authorizeJwt(issuer, identity);
    if (!isAuthorized.success) {
      return isAuthorized;
    }

    const identityId = identity?.jwt?.payload?.sub;
    return ServiceResult.Succeeded(identityId, this.logContext);
  }

  constructor(logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("JwtValidator");
  }

  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    Logger.debug(
      `Authorization: JWT jwtCaller (JwtValidator)-> ${jwtCaller.jwt.keyIssuer}`,
      this.logContext
    );
    const isValidJwtToken = this.isValidJwtToken(jwtCaller);
    Logger.debug(
      `Authorization: JWT validation result (JwtValidator) for provider ${jwtCaller.jwt.keyIssuer}-> ${JSON.stringify(isValidJwtToken)}`,
      this.logContext
    );
    return isValidJwtToken;
  }
}
