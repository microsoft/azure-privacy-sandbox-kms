// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IKeyReleasePolicyProps } from "../policies/IKeyReleasePolicyProps";
import { enableEndpoint, getKeyReleasePolicy } from "../utils/Tooling";
import { keyReleasePolicyMap } from "../repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";

// Enable the endpoint
enableEndpoint();

/**
 * Retrieves the key release policy.
 * @returns A ServiceResult containing the key release policy properties.
 */
export const keyReleasePolicy = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IKeyReleasePolicyProps> => {
  const name = "keyReleasePolicy";
  const serviceRequest = new ServiceRequest<void>(name, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  const result = getKeyReleasePolicy(keyReleasePolicyMap);
  return ServiceResult.Succeeded<IKeyReleasePolicyProps>(result);
};
