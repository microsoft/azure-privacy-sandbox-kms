// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceResult } from "../utils/ServiceResult";
import { IKeyReleasePolicyProps } from "../policies/IKeyReleasePolicyProps";
import { enableEndpoint, getKeyReleasePolicy } from "../utils/Tooling";
import { keyReleasePolicyMap } from "../repositories/Maps";

// Enable the endpoint
enableEndpoint();

/**
 * Retrieves the key release policy.
 * @returns A ServiceResult containing the key release policy properties.
 */
export const keyReleasePolicy = (): ServiceResult<IKeyReleasePolicyProps> => {
  const result = getKeyReleasePolicy(keyReleasePolicyMap);
  return ServiceResult.Succeeded<IKeyReleasePolicyProps>(result);
};
