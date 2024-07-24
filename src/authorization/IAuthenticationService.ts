// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";

export interface IAuthenticationService {
  /**
   * Checks if caller is an active member or a registered user or has a valid JWT token
   * @param {string} identityId userId extracted from mTLS certificate
   * @returns {ServiceResult<boolean>}
   */
  isAuthenticated(
    request: ccfapp.Request<any>,
  ): [ccfapp.AuthnIdentityCommon | undefined, ServiceResult<string>];
}
