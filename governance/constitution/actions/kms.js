// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

actions.set(
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
      const validationPolicyMapName = "public:ccf.gov.policies.jwt_validation";

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
);
actions.set(
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
      const keyRotationPolicyMapName = "public:ccf.gov.policies.key_rotation";

      // Save policy in the KV
      const key = "key_rotation_policy";
      const keyBuf = ccf.strToBuf(key);
      const jsonItems = JSON.stringify(args.key_rotation_policy);
      const jsonItemsBuf = ccf.strToBuf(jsonItems);
      ccf.kv[keyRotationPolicyMapName].set(keyBuf, jsonItemsBuf);
      console.log(
        `Key rotation policy ${jsonItems} saved in ${keyRotationPolicyMapName}`,
      );
    },
  ),
);
