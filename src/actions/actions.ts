// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as settings_policy from "./set_settings_policy";


export class ICCFAction {

    validate: (args: any) => void;
    apply: (args: any) => void;

    constructor(validate, apply) {
        this.validate = validate;
        this.apply = apply;
    }
}


export const actions = new Map<string, ICCFAction>([
    settings_policy,
].map((policy) => policy.action)
 .map((action) => [action[0], new ICCFAction(...action[1])]));
