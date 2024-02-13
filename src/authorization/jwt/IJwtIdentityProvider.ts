// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";

export interface IJwtIdentityProvider {
  isValidJwtToken(identity: ccfapp.JwtAuthnIdentity): ServiceResult<string>;
  name: string;
}