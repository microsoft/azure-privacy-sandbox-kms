actions.set(
  "set_key_release_policy",
  new Action(
    function (args) {
      checkType(args.type, "string");
      checkType(args.claims, "object");
    },
    function (args) {
      const Claims = {
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
      const add = (claims) => {
        let items = [];
        console.log(
          `Add claims to key release policy: ${JSON.stringify(claims)}`,
        );
        Object.keys(claims).forEach((key) => {
          if (Claims[key] === undefined) {
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
          if (Claims[key] === undefined) {
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
