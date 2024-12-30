// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

actions.set(
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
      const settingsPolicyMapName = "public:ccf.gov.policies.settings";

      // Save policy in the KV
      const key = "settings_policy";
      const keyBuf = ccf.strToBuf(key);
      const jsonItems = JSON.stringify(args.settings_policy);
      const jsonItemsBuf = ccf.strToBuf(jsonItems);
      ccf.kv[settingsPolicyMapName].set(keyBuf, jsonItemsBuf);
      console.log(
        `[INFO] [scope=set_settings_policy] Settings policy ${jsonItems} saved in ${settingsPolicyMapName}`,
      );
    },
  ),
);
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
  "set_key_release_policy",
  new Action(
    function (args) {
      checkType(args.type, "string");
      checkType(args.claims, "object");
    },
    function (args) {
      const CLAIMS = {
        "x-ms-attestation-type": "string",
        "x-ms-compliance-status": "string",
        "x-ms-policy-hash": "string",
        "vm-configuration-secure-boot": "boolean",
        "vm-configuration-secure-boot-template-id": "string",
        "vm-configuration-tpm-enabled": "boolean",
        "vm-configuration-vmUniqueId": "string",
        "x-ms-sevsnpvm-authorkeydigest": "string",
        "x-ms-sevsnpvm-bootloader-svn": "number",
        "x-ms-sevsnpvm-familyId": "string",
        "x-ms-sevsnpvm-guestsvn": "number",
        "x-ms-sevsnpvm-hostdata": "string",
        "x-ms-sevsnpvm-idkeydigest": "string",
        "x-ms-sevsnpvm-imageId": "string",
        "x-ms-sevsnpvm-is-debuggable": "boolean",
        "x-ms-sevsnpvm-launchmeasurement": "string",
        "x-ms-sevsnpvm-microcode-svn": "number",
        "x-ms-sevsnpvm-migration-allowed": "boolean",
        "x-ms-sevsnpvm-reportdata": "string",
        "x-ms-sevsnpvm-reportid": "string",
        "x-ms-sevsnpvm-smt-allowed": "boolean",
        "x-ms-sevsnpvm-snpfw-svn": "number",
        "x-ms-sevsnpvm-tee-svn": "number",
        "x-ms-sevsnpvm-vmpl": "number",
        "x-ms-ver": "string",
      };
      const keyReleaseMapName = "public:ccf.gov.policies.key_release";
      // Function to add key release policy claims
      const add = (type, claims) => {
        let items = {};
        console.log(
          `[INFO] [scope=set_key_release_policy->add] Add claims to key release policy for ${type}: ${JSON.stringify(claims)}`,
        );
        // get all the claims for type from the KV
        let keyBuf = ccf.strToBuf(type);
        if (ccf.kv[keyReleaseMapName].has(keyBuf)) {
          // type is already available
          const itemsBuf = ccf.kv[keyReleaseMapName].get(keyBuf);
          items = ccf.bufToStr(itemsBuf);
          console.log(
            `[INFO] [scope=set_key_release_policy->add] KRP add ${type}=>key: ${type} already exist: ${items} in the key release policy`,
          );
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.log(
              `[ERROR] [scope=set_key_release_policy->add] KRP add ${type}=>Error parsing ${items} from key release policy during add`,
              e,
            );
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->add] Error parsing ${items} from key release policy during add`,
              e,
            );
          }
        } else {
          console.log(
            `[INFO] [scope=set_key_release_policy->add] KRP add ${type}=>key: ${type} is new in the key release policy`,
          );
        }

        // iterate over every claim
        Object.keys(claims).forEach((key) => {
          if (CLAIMS[key] === undefined) {
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->add] KRP add ${type}=>The claim ${key} is not an allowed claim`,
            );
          }
          let item = claims[key];
          // Make sure item is always an array
          if (!Array.isArray(item)) {
            item = [item];
          }

          if (items[key] !== undefined) {
            item.forEach((i) => {
              console.log(`[INFO] [scope=set_key_release_policy->add] KRP add ${type}=>Adding ${i} to ${key}`);
              items[key].push(i);
            });
          } else {
            items[key] = item;
            console.log(`[INFO] [scope=set_key_release_policy->add] KRP add ${type}=>currrent items: `, items);
          }
        });

        // Safe into KV
        console.log(`[INFO] [scope=set_key_release_policy->add] KRP add ${type}=>items: `, items);
        let jsonItems = JSON.stringify(items);
        console.log(
         `[INFO] [scope=set_key_release_policy->add] Add claims to key release policy for ${type}: ${JSON.stringify(claims)}`,
        );
        let jsonItemsBuf = ccf.strToBuf(jsonItems);
        ccf.kv[keyReleaseMapName].set(keyBuf, jsonItemsBuf);
      };
      // Function to add key release policy operator
      const addOperator = (type, claims) => {
        let items = {};
        console.log(
          `[INFO] [scope=set_key_release_policy->addOperator] Add claims to key release policy for ${type}: ${JSON.stringify(claims)}`,
        );
        // get all the claims for type from the KV
        let keyBuf = ccf.strToBuf(type);
        if (ccf.kv[keyReleaseMapName].has(keyBuf)) {
          // type is already available
          const itemsBuf = ccf.kv[keyReleaseMapName].get(keyBuf);
          items = ccf.bufToStr(itemsBuf);
          console.log(
            `[INFO] [scope=set_key_release_policy->addOperator] KRP add ${type}=>key: ${type} already exist: ${items} in the key release policy`,
          );
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.log(
              `[ERROR] [scope=set_key_release_policy->addOperator] KRP addOperator ${type}=>Error parsing ${items} from key release policy`,
              e,
            );
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->addOperator] Error parsing ${items} from key release policy during addOperator`,
              e,
            );
          }
        } else {
          console.log(
            `[INFO] [scope=set_key_release_policy->addOperator] KRP add ${type}=>key: ${type} is new in the key release policy`,
          );
        }

        // iterate over every claim
        Object.keys(claims).forEach((key) => {
          if (CLAIMS[key] === undefined) {
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->addOperator] KRP add ${type}=>The claim ${key} is not an allowed claim`,
            );
          }
          let item = claims[key];
          // Make sure item is always an array
          if (Array.isArray(item)) {
            throw new Error(`[ERROR] [scope=set_key_release_policy->addOperator] The operator claim ${key} cannot be an array`);
          }

          items[key] = item;
        });

        // Safe into KV
        console.log(`[INFO] [scope=set_key_release_policy->addOperator] KRP add ${type}=>items: `, items);
        let jsonItems = JSON.stringify(items);
        console.log(
          `[INFO] [scope=set_key_release_policy->addOperator] KRP add ${type}=>Add claims to key release policy for ${type}: ${jsonItems}`,
        );
        let jsonItemsBuf = ccf.strToBuf(jsonItems);
        ccf.kv[keyReleaseMapName].set(keyBuf, jsonItemsBuf);
      };

      // Function to remove key release policy claims
      const remove = (type, claims) => {
        let items = {};
        console.log(
          `[INFO] [scope=set_key_release_policy->remove] Remove claims from key release policy for ${type}: ${JSON.stringify(claims)}`,
        );
        // get all the claims for type from the KV
        let keyBuf = ccf.strToBuf(type);
        if (ccf.kv[keyReleaseMapName].has(keyBuf)) {
          // type is available
          const itemsBuf = ccf.kv[keyReleaseMapName].get(keyBuf);
          items = ccf.bufToStr(itemsBuf);
          console.log(
            `[INFO] [scope=set_key_release_policy->remove] KRP remove ${type}=>key: ${type} exist: ${items} in the key release policy`,
          );
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.log(
              `[ERROR] [scope=set_key_release_policy->remove] KRP remove ${type}=>Error parsing ${items} from key release policy`,
              e,
            );
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->remove] Error parsing ${items} from key release policy during remove`,
              e,
            );
          }
        } else {
          console.log(
            `[ERROR] [scope=set_key_release_policy->remove] KRP remove ${type}=>key: ${type} does not exists in the key release policy`,
          );
          throw new Error(
            `[ERROR] [scope=set_key_release_policy->remove] The key ${type} does not exists in the key release policy`,
          );
        }

        // iterate over every claim
        Object.keys(claims).forEach((key) => {
          if (CLAIMS[key] === undefined) {
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->remove] KRP remove ${type}=>The claim ${key} is not an allowed claim`,
            );
          }
          let item = claims[key];
          // Make sure item is always an array
          if (!Array.isArray(item)) {
            item = [item];
          }

          if (items[key] !== undefined) {
            item.forEach((i) => {
              console.log(`[INFO] [scope=set_key_release_policy->remove] KRP remove ${type}=>Removing ${i} from ${key}`);
              items[key] = items[key].filter((value) => value !== i);
              if (items[key].length === 0) {
                delete items[key];
              }
            });
          } else {
            console.log(
              `[ERROR] [scope=set_key_release_policy->remove] KRP remove ${type}=>Claim ${key} not found in the key release policy`,
            );
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->remove] The claim ${key} does not exists in the key release policy`,
            );
          }
        });

        // Safe into KV
        console.log(`[INFO] [scope=set_key_release_policy->remove] KRP remove ${type}=>items: `, items);
        let jsonItems = JSON.stringify(items);
        console.log(
          `[INFO] [scope=set_key_release_policy->remove] KRP remove ${type}=>Remove claims from key release policy for ${type}: ${jsonItems}`,
        );
        let jsonItemsBuf = ccf.strToBuf(jsonItems);
        ccf.kv[keyReleaseMapName].set(keyBuf, jsonItemsBuf);
      };

      const removeOperator = (type, claims) => {
        let items = {};
        console.log(
          `[INFO] [scope=set_key_release_policy->removeOperator] Remove claims from key release policy for ${type}: ${JSON.stringify(claims)}`,
        );
        // get all the claims for type from the KV
        let keyBuf = ccf.strToBuf(type);
        if (ccf.kv[keyReleaseMapName].has(keyBuf)) {
          // type is available
          const itemsBuf = ccf.kv[keyReleaseMapName].get(keyBuf);
          items = ccf.bufToStr(itemsBuf);
          console.log(
            `[INFO] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>key: ${type} exist: ${items} in the key release policy`,
          );
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.log(
              `[ERROR] [scope=set_key_release_policy->removeOperator] KRP removeOperator ${type}=>Error parsing ${items} from key release policy`,
              e,
            );
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->removeOperator] Error parsing ${items} from key release policy during removeOperator`,
              e,
            );
          }
        } else {
          console.log(
            `[ERROR] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>key: ${type} does not exists in the key release policy`,
          );
          throw new Error(
            `[ERROR] [scope=set_key_release_policy->removeOperator] The key ${type} does not exists in the key release policy`,
          );
        }

        // iterate over every claim
        Object.keys(claims).forEach((key) => {
          if (CLAIMS[key] === undefined) {
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>The claim ${key} is not an allowed claim`,
            );
          }
          let item = claims[key];
          // Make sure item is always an array
          if (Array.isArray(item)) {
            throw new Error(`[ERROR] [scope=set_key_release_policy->removeOperator] The operator claim ${key} cannot be an array`);
          }

          if (items[key] !== undefined) {
            console.log(`[INFO] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>Removing ${item} from ${key}`);
            delete items[key];
          } else {
            console.log(
              `[INFO] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>Claim ${key} not found in the key release policy`,
            );
            throw new Error(
              `[ERROR] [scope=set_key_release_policy->removeOperator] The claim ${key} does not exists in the key release policy`,
            );
          }
        });

        // Save into KV
        console.log(`[INFO] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>items: `, items);
        let jsonItems = JSON.stringify(items);
        console.log(
          `[INFO] [scope=set_key_release_policy->removeOperator] KRP remove ${type}=>Remove claims from key release policy for ${type}: ${jsonItems}`,
        );
        let jsonItemsBuf = ccf.strToBuf(jsonItems);
        ccf.kv[keyReleaseMapName].set(keyBuf, jsonItemsBuf);
      };

      const type = args.type;
      switch (type) {
        case "add":
          add("claims", args.claims);
          if (args.gte !== undefined) {
            addOperator("gte", args.gte);
          }
          if (args.gt !== undefined) {
            addOperator("gt", args.gt);
          }

          break;
        case "remove":
          remove("claims", args.claims);
          if (args.gte !== undefined) {
            removeOperator("gte", args.gte);
          }
          if (args.gt !== undefined) {
            removeOperator("gt", args.gt);
          }
          break;
        default:
          throw new Error(
            `[ERROR] [scope=set_key_release_policy] Key Release Policy with type ${type} is not supported`,
          );
      }
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
