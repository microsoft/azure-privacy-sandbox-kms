// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { IJwtIdentityProvider } from "./JwtValidator";
import { ServiceResult } from "../../utils/ServiceResult";

export class DemoJwtProvider implements IJwtIdentityProvider {
  /**
   * Check if caller's access token is valid
   * @param {JwtAuthnIdentity} identity JwtAuthnIdentity object
   * @returns {ServiceResult<string>}
   */
  public isValidJwtToken(
    identity: ccfapp.JwtAuthnIdentity,
  ): ServiceResult<string> {
    const identityId = identity?.jwt?.payload?.sub;
    console.log(`Authorization: JWT validation result (DemoJwtProvider)-> ${identityId}`)
    return ServiceResult.Succeeded(identityId);
  }
}
