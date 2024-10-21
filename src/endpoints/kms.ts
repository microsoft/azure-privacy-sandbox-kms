// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Settings } from "../policies/Settings";
import { LogContext } from "../utils/Logger";

// Enable the endpoint
enableEndpoint();

export interface IHeartbeatResponse {
  auth: ccfapp.AuthnIdentityCommon;
  description: string[];
}

/*
 * Heartbeat endpoint currently used to test authorization
 *
 * @param request - The request object.
 * @returns A `ServiceResult` containing either a string or an `AuthnIdentityCommon` object.
 */
export const heartbeat = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IHeartbeatResponse> => {
  const logContext = new LogContext().appendScope("heartbeat");
  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [policy, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  const settings = Settings.loadSettings();
  const description = [
    settings.settings.service.name,
    settings.settings.service.description,
    settings.settings.service.version,
    settings.settings.service.debug.toString(),
  ];

  return ServiceResult.Succeeded<IHeartbeatResponse>({
    auth: policy!,
    description,
  }, undefined, logContext);
};
