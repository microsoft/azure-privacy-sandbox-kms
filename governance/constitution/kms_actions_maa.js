// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

actions.set(
  "set_settings_policy",
  new Action(
    function (args) {
      console.log(`set_settings_policy, check args: ${JSON.stringify(args)}`);
      checkType(args.settings_policy, "object", "settings_policy");
      checkType(args.settings_policy.service, "object", "service");

      // Check settings policy
      checkType(args.settings_policy.service.name, "string");
      checkType(args.settings_policy.service.description, "string");
      checkType(args.settings_policy.service.version, "string");
      checkType(args.settings_policy.service.debug, "boolean");
      console.log(`Settings policy validation passed`);
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
        `Settings policy ${jsonItems} saved in ${settingsPolicyMapName}`,
      );
    },
  ),
);
actions.set(
  "set_jwt_validation_policy",
  new Action(
    function (args) {
      console.log(
        `set_jwt_validation_policy, check args: ${JSON.stringify(args)}`,
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
              `validation policy: key ${key} is array = `,
              args.validation_policy[key],
            );
          } else {
            console.log(
              `validation policy: key ${key} = ${args.validation_policy[key]}`,
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
        `JWT validation policy item. Key: ${args.issuer}, value: ${jsonItems}`,
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
        "secureboot": "boolean",
        "x-ms-attestation-type": "string",
        "x-ms-azurevm-attestation-protocol-ver": "string",
        "x-ms-azurevm-attested-pcrs": "number[]",
        "x-ms-azurevm-bootdebug-enabled": "boolean",
        "x-ms-azurevm-dbvalidated": "boolean",
        "x-ms-azurevm-dbxvalidated": "boolean",
        "x-ms-azurevm-debuggersdisabled": "boolean",
        "x-ms-azurevm-default-securebootkeysvalidated": "boolean",
        "x-ms-azurevm-elam-enabled": "boolean",
        "x-ms-azurevm-flightsigning-enabled": "boolean",
        "x-ms-azurevm-hvci-policy": "number",
        "x-ms-azurevm-hypervisordebug-enabled": "boolean",
        "x-ms-azurevm-is-windows": "boolean",
        "x-ms-azurevm-kerneldebug-enabled": "boolean",
        "x-ms-azurevm-osbuild": "string",
        "x-ms-azurevm-osdistro": "string",
        "x-ms-azurevm-ostype": "string",
        "x-ms-azurevm-osversion-major": "number",
        "x-ms-azurevm-osversion-minor": "number",
        "x-ms-azurevm-signingdisabled": "boolean",
        "x-ms-azurevm-testsigning-enabled": "boolean",
        "x-ms-azurevm-vmid": "string",
        "x-ms-isolation-tee": "object",
        "x-ms-policy-hash": "string",
        "x-ms-runtime": {
          "client-payload": {
            "a": "string"
          },
          "keys": "object",
        },
        "x-ms-ver": "string"
      };
      const keyReleaseMapName = "public:ccf.gov.policies.key_release";
      // Function to add key release policy claims
      const add = (claims) => {
        let items = [];
        console.log(
          `Add claims to key release policy: ${JSON.stringify(claims)}`,
        );
        Object.keys(claims).forEach((key) => {
          if (CLAIMS[key] === undefined) {
            throw new Error(`The claim ${key} is not an allowed claim`);
          }
          let item = claims[key];
          // Make sure item is always an array
          if (!Array.isArray(item)) {
            item = [item];
          }

          let keyBuf = ccf.strToBuf(key);
          if (ccf.kv[keyReleaseMapName].has(keyBuf)) {
            // Key is already available
            const itemsBuf = ccf.kv[keyReleaseMapName].get(keyBuf);
            items = ccf.bufToStr(itemsBuf);
            console.log(`key: ${key} already exist: ${items}`);
            items = JSON.parse(items);
            if (typeof item[0] === "boolean") {
              //booleans are single value arrays
              items = item;
            } else {
              // loop through the input and add it to the existing set
              item.forEach((i) => {
                items.push(i);
              });
            }
          } else {
            // set single value
            items = item;
          }

          // prepare and store items
          let jsonItems = JSON.stringify(items);
          let jsonItemsBuf = ccf.strToBuf(jsonItems);
          console.log(
            `Voted key release policy item. Key: ${key}, value: ${jsonItems}`,
          );
          ccf.kv[keyReleaseMapName].set(keyBuf, jsonItemsBuf);
        });
      };

      // Function to remove key release policy claims
      const remove = (claims) => {
        let items = [];
        console.log(
          `Remove claims to key release policy: ${JSON.stringify(claims)}`,
        );
        Object.keys(claims).forEach((key) => {
          if (CLAIMS[key] === undefined) {
            throw new Error(`The claim ${key} is not an allowed claim`);
          }
          let item = claims[key];
          // Make sure item is always an array
          if (!Array.isArray(item)) {
            item = [item];
          }

          let keyBuf = ccf.strToBuf(key);
          if (ccf.kv[keyReleaseMapName].has(keyBuf)) {
            // Key must be available
            const itemsBuf = ccf.kv[keyReleaseMapName].get(keyBuf);
            items = ccf.bufToStr(itemsBuf);
            console.log(`key: ${key} exist: ${items}`);
            items = JSON.parse(items);
            if (typeof item[0] === "boolean") {
              //booleans are single value arrays, removing will remove the whole key
              ccf.kv[keyReleaseMapName].delete(keyBuf);
            } else {
              // loop through the input and delete it from the existing set
              item.forEach((i) => {
                if (items.filter((ii) => ii === i).length === 0) {
                  throw new Error(
                    `Trying to remove value '${i}' from ${items} and it does not exist`,
                  );
                }
                // Remove value from list
                const index = items.indexOf(i);
                if (index > -1) {
                  items.splice(index, 1);
                }
              });
              // update items
              if (items.length === 0) {
                ccf.kv[keyReleaseMapName].delete(keyBuf);
              } else {
                let jsonItems = JSON.stringify(items);
                let jsonItemsBuf = ccf.strToBuf(jsonItems);
                ccf.kv[keyReleaseMapName].set(keyBuf, jsonItemsBuf);
              }
            }
          } else {
            throw new Error(
              `Cannot remove values of ${key} because the key does not exist in the key release policy claims`,
            );
          }
        });
      };

      const type = args.type;
      switch (type) {
        case "add":
          add(args.claims);
          break;
        case "remove":
          remove(args.claims);
          break;
        default:
          throw new Error(
            `Key Release Policy with type ${type} is not supported`,
          );
      }
    },
  ),
);
