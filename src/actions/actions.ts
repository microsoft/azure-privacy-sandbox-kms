// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action } from "./default_ccf";
import { action as settingsPolicyAction } from "./set_settings_policy";


export const actions = new Map<string, Action>([
    settingsPolicyAction,
]);
