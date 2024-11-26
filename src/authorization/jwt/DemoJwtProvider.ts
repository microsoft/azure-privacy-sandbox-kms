// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";
import { authorizeJwt } from "./MsJwtProvider";
import { Logger, LogContext } from "../../utils/Logger";

const errorType = "AuthenticationError";

export class DemoJwtProvider implements IJwtIdentityProvider {
  constructor(public name: string) {}
  private static readonly logContext = new LogContext().appendScope("DemoJwtProvider");

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
      }, 400, DemoJwtProvider.logContext);
    }

    const isAuthorized = authorizeJwt(issuer, identity);
    if (!isAuthorized.success) {
      return isAuthorized;
    }

    const identityId = identity?.jwt?.payload?.sub;
    Logger.debug(`JWT validation succeeded: ${identityId}`, DemoJwtProvider.logContext);
    return ServiceResult.Succeeded(identityId, DemoJwtProvider.logContext);
  }
}
