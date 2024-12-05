// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { LogContext } from "../utils/Logger";
import { ISettings, Settings } from "../policies/Settings";
import { settingsPolicyMap } from "../repositories/Maps";

// Enable the endpoint
enableEndpoint();

/**
 * Retrieves the settings policy.
 * @returns A ServiceResult containing the settings policy properties.
 */
export const settingsPolicy = (
  request: ccfapp.Request<void>
): ServiceResult<string | ISettings> => {
  const logContext = new LogContext().appendScope("settingsPolicyEndpoint");
  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    const result =
      Settings.loadSettingsFromMap(settingsPolicyMap, logContext).settings;
    return ServiceResult.Succeeded<ISettings>(result, logContext);
  } catch (error: any) {
    return ServiceResult.Failed<string>({ errorMessage: error.message }, 500, logContext);
  }
};
