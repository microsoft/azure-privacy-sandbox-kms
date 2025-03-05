// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { Logger, LogContext } from "../../utils/Logger";
import { JwtValidationPolicyMap } from "./JwtValidationPolicyMap";
import isMatch from 'lodash/isMatch';

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
    const policy = JwtValidationPolicyMap.read(issuer, this.logContext);
    if (policy === undefined) {
      const errorMessage = `issuer ${issuer} is not defined in the policy`;
      Logger.error(errorMessage, this.logContext);
      return ServiceResult.Failed(
        {
          errorMessage,
          errorType: "AuthenticationError",
        },
        500,
        this.logContext
      );
    }
    Logger.debug(
      `Validate JWT policy for issuer ${issuer}: ${JSON.stringify(policy)}`, this.logContext
    );

    // Check that the JWT payload is a matching superset of the policy
    if (!isMatch(identity.jwt.payload, policy)) {
      const errorMessage = `The JWT ${JSON.stringify(identity.jwt.payload)} doesn't match the policy ${JSON.stringify(policy)}`;
      Logger.error(errorMessage, this.logContext);
      return ServiceResult.Failed(
        { errorMessage, errorType: "AuthenticationError" },
        401,
        this.logContext
      );
    }

    return ServiceResult.Succeeded("", this.logContext);
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
