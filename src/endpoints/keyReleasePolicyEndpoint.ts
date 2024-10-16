// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { keyReleasePolicyMap } from "../repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";
import { KeyReleasePolicy } from "../policies/KeyReleasePolicy";
import { IKeyReleasePolicy } from "../policies/IKeyReleasePolicy";

// Enable the endpoint
enableEndpoint();

/**
 * Retrieves the key release policy.
 * @returns A ServiceResult containing the key release policy properties.
 */
export const keyReleasePolicy = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IKeyReleasePolicy> => {
  const name = "keyReleasePolicy";
  const serviceRequest = new ServiceRequest<void>(name, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    const result =
      KeyReleasePolicy.getKeyReleasePolicyFromMap(keyReleasePolicyMap);
    return ServiceResult.Succeeded<IKeyReleasePolicy>(result);
  } catch (error: any) {
    return ServiceResult.Failed<string>({ errorMessage: error.message }, 500);
  }
};
