// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { JwtIdentityProviderEnum } from "./JwtIdentityProviderEnum";
import { authorizeJwt } from "./JwtProvider";
import { Logger, LogContext } from "../../utils/Logger";

export class JwtValidator implements IValidatorService {
  private logContext: LogContext;


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

  constructor(logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("JwtValidator");
  }

  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    Logger.debug(
      `Authorization: JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`,
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
