// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export let action =
  [
    "set_settings_policy",
    [
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
    ]
  ];
