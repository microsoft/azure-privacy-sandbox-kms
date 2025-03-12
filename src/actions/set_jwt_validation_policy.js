// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, checkType } from "./default_ccf.js";
import { ccf } from "@microsoft/ccf-app/global";
import { validationPolicyMapName } from "../authorization/jwt/JwtValidationPolicyMap";

export let action = [
    "set_jwt_validation_policy",
    new Action(
      function (args) {
        console.log(
          `[INFO] [scope=set_jwt_validation_policy] Check args: ${JSON.stringify(args)}`,
        );
        checkType(args.issuer, "string", "issuer");
        checkType(args.validation_policy, "object", "validation_policy");

        // Check if issuer exists
        //if (!ccf.kv[validationPolicyMapName].has(args.issuer))  {
        //  throw new Error(``);
        //}

        // Check validation policy
        if (args.validation_policy) {
          Object.keys(args.validation_policy).forEach((key) => {
            if (Array.isArray(args.validation_policy[key])) {
              console.log(
                `[INFO] [scope=set_jwt_validation_policy] Validation policy: key ${key} is array = `,
                args.validation_policy[key],
              );
            } else {
              console.log(
                `[INFO] [scope=set_jwt_validation_policy] Validation policy: key ${key} = ${args.validation_policy[key]}`,
              );
              checkType(args.validation_policy[key], "string", key);
            }
          });
        }
      },
      function (args) {

        const keyBuf = ccf.strToBuf(args.issuer);

        // Remove existing validation policy
        ccf.kv[validationPolicyMapName].delete(keyBuf);

        const jsonItems = JSON.stringify(args.validation_policy);
        const jsonItemsBuf = ccf.strToBuf(jsonItems);
        console.log(
          `[INFO] [scope=set_jwt_validation_policy] JWT validation policy item. Key: ${args.issuer}, value: ${jsonItems}`,
        );
        ccf.kv[validationPolicyMapName].set(keyBuf, jsonItemsBuf);
      },
    ),
];