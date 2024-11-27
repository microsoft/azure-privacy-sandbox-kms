// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { LogContext } from "../utils/Logger";

// Enable the endpoint
enableEndpoint();

export interface IAuthResponse {
  auth: ccfapp.AuthnIdentityCommon;
}

export interface IHeartbeatResponse {
  status: string;
}

/*
 * auth endpoint used to test authorization
 *
 * @param request - The request object.
 * @returns A `ServiceResult` containing either a string or an `AuthnIdentityCommon` object.
 */
export const auth = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IAuthResponse> => {
  const logContext = new LogContext().appendScope("authEndpoint");
  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [policy, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  return ServiceResult.Succeeded<IAuthResponse>({
    auth: policy!
  }, logContext);
};

/*
 * Hearthbeat returns 200 when running
 *
 * @param request - The request object.
 * @returns A `ServiceResult` containing either a string or an `AuthnIdentityCommon` object.
 */
export const heartbeat = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IHeartbeatResponse> => {
  const logContext = new LogContext().appendScope("heartbeatEndpoint");
  new ServiceRequest<void>(logContext, request);

  const description = {
    status: "Service is running",
  };

  return ServiceResult.Succeeded<IHeartbeatResponse>(description, logContext);
};
