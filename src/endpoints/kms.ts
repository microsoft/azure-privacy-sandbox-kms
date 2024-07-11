// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";

// Enable the endpoint
enableEndpoint();

/*
 * Hearthbeat endpoint currently used to test authorization
 *
 * @param request - The request object.
 * @returns A `ServiceResult` containing either a string or an `AuthnIdentityCommon` object.
 */
export const hearthbeat = (
  request: ccfapp.Request<void>,
): ServiceResult<string | ccfapp.AuthnIdentityCommon> => {
  const name = "hearthbeat";
  const serviceRequest = new ServiceRequest<void>(name, request);

  // check if caller has a valid identity
  const [policy, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  return ServiceResult.Succeeded<ccfapp.AuthnIdentityCommon>(policy);
};
