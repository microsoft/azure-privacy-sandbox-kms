// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceResult } from "../utils/ServiceResult";
import { IKeyReleasePolicyProps } from "../policies/IKeyReleasePolicyProps";
import { getKeyReleasePolicy } from "../utils/Tooling";
import { keyReleasePolicyMap } from "../repositories/Maps";

/**
 * Retrieves the key release policy.
 * @returns A ServiceResult containing the key release policy properties.
 */
export const key_release_policy = (): ServiceResult<IKeyReleasePolicyProps> => {
    const result = getKeyReleasePolicy(keyReleasePolicyMap);
    return ServiceResult.Succeeded<IKeyReleasePolicyProps>(result);
  };
  