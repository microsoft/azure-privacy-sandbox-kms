// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action } from "./default_ccf";
import { action as settingsPolicyAction } from "./set_settings_policy";
import { action as jwtValidationPolicyAction } from "./set_jwt_validation_policy";


export const actions = new Map<string, Action>([
    settingsPolicyAction,
    jwtValidationPolicyAction,
]);
