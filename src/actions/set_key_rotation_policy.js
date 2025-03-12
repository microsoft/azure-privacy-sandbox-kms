// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, checkType } from "./default_ccf.js";
import { ccf } from "@microsoft/ccf-app/global";
import { keyRotationMapName } from "../repositories/Maps.js";

export let action = [
    "set_key_rotation_policy",
    // validate function
    new Action(
      function (args) {
        console.log(
          `set_key_rotation_policy, check args: ${JSON.stringify(args)}`,
        );
        checkType(args.key_rotation_policy, "object", "set_key_rotation_policy");

        // Check settings policy
        checkType(
          args.key_rotation_policy.rotation_interval_seconds,
          "integer",
          "Number_of_seconds_between_key_rotations",
        );
        checkType(
          args.key_rotation_policy.grace_period_seconds,
          "integer",
          "Number_of_seconds_to_allow_an_expired_key_to_be_used_by_clients",
        );
        console.log(`Key rotation policy validation passed.`);
      },

      // apply function
      function (args) {
        // Save policy in the KV
        const key = "key_rotation_policy";
        const keyBuf = ccf.strToBuf(key);
        const jsonItems = JSON.stringify(args.key_rotation_policy);
        const jsonItemsBuf = ccf.strToBuf(jsonItems);
        ccf.kv[keyRotationMapName].set(keyBuf, jsonItemsBuf);
        console.log(
          `Key rotation policy ${jsonItems} saved in ${keyRotationMapName}`,
        );
      },
    ),
];