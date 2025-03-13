// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, checkType } from "./default_ccf.js";
import { ccf } from "@microsoft/ccf-app/global";
import { settingsMapName } from "../repositories/Maps.js";

export let action =
  [
    "set_settings_policy",
    new Action(
      function (args) {
        console.log(`[INFO] [scope=set_settings_policy] Check args: ${JSON.stringify(args)}`);
        checkType(args.settings_policy, "object", "settings_policy");
        checkType(args.settings_policy.service, "object", "service");

        // Check settings policy
        checkType(args.settings_policy.service.name, "string");
        checkType(args.settings_policy.service.description, "string");
        checkType(args.settings_policy.service.version, "string");
        checkType(args.settings_policy.service.debug, "boolean");
        console.log(`[INFO] [scope=set_settings_policy] Settings policy validation passed`);
      },
      function (args) {

        // Save policy in the KV
        const key = "settings_policy";
        const keyBuf = ccf.strToBuf(key);
        const jsonItems = JSON.stringify(args.settings_policy);
        const jsonItemsBuf = ccf.strToBuf(jsonItems);
        ccf.kv[settingsMapName].set(keyBuf, jsonItemsBuf);
        console.log(
          `[INFO] [scope=set_settings_policy] Settings policy ${jsonItems} saved in ${settingsMapName}`,
        );
      },
    )
  ];
