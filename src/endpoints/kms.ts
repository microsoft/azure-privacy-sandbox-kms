// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { AuthenticationService } from "../authorization/AuthenticationService";
import { ServiceResult } from "../utils/ServiceResult";

/*
 * Hearthbeat endpoint currently used ro test authorization
 *
 * @param request - The request object.
 * @returns A `ServiceResult` containing either a string or an `AuthnIdentityCommon` object.
 */
export const hearthbeat = (
  request: ccfapp.Request<void>,
): ServiceResult<string | ccfapp.AuthnIdentityCommon> => {
  // check if caller has a valid identity
  const [policy, isValidIdentity] = new AuthenticationService().isAuthenticated(
    request,
  );
  console.log(
    `Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`,
  );
  if (isValidIdentity.failure) return isValidIdentity;
  return ServiceResult.Succeeded<ccfapp.AuthnIdentityCommon>(policy);
};
