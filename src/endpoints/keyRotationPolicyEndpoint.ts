// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { keyRotationPolicyMap } from "../repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";
import { LogContext } from "../utils/Logger";
import { KeyRotationPolicy } from "../policies/KeyRotationPolicy";
import { IKeyRotationPolicy } from "../policies/IKeyRotationPolicy";

// Enable the endpoint
enableEndpoint();

/**
 * Retrieves the key rotation policy.
 * @returns A ServiceResult containing the key rotation policy properties.
 */
export const keyRotationPolicy = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IKeyRotationPolicy | {}> => {
  const logContext = new LogContext().appendScope("keyRotationPolicy");
  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    const result =
      KeyRotationPolicy.getKeyRotationPolicyFromMap(keyRotationPolicyMap, logContext) || {};
      return ServiceResult.Succeeded<IKeyRotationPolicy>(result as IKeyRotationPolicy, logContext);
  } catch (error: any) {
    return ServiceResult.Failed<string>({ errorMessage: error.message }, 500, logContext);
  }
};
