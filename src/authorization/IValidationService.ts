// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";

/**
 * Validator Service Interface
 */

export interface IValidatorService {
  validate(request: ccfapp.Request<any>): ServiceResult<string>;
}
