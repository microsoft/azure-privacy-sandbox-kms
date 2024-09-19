// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyReleasePolicy } from "./IKeyReleasePolicy";
import { IKeyReleasePolicySnpProps } from "./IKeyReleasePolicySnpProps";
import { Logger } from "../utils/Logger";

export class KeyReleasePolicy implements IKeyReleasePolicy {
  public type = "add";
  public claims = {
    "x-ms-attestation-type": ["snp"],
  };


/**
 * Retrieves the key release policy from a key release policy map.
 * @param keyReleasePolicyMap - The key release policy map.
 * @returns The key release policy as an object.
 */
public static getKeyReleasePolicyFromMap = (
  keyReleasePolicyMap: ccfapp.KvMap,
): IKeyReleasePolicySnpProps => {
  const result: IKeyReleasePolicySnpProps = {};
  keyReleasePolicyMap.forEach((values: ArrayBuffer, key: ArrayBuffer) => {
    const kvKey = ccf.bufToStr(key);
    const kvValue = JSON.parse(ccf.bufToStr(values));
    result[kvKey] = kvValue;
    Logger.debug(`key policy item with key: ${kvKey} and value: ${kvValue}`);
  });
  Logger.debug(
    `Resulting key release policy: ${JSON.stringify(
      result,
    )}, keys: ${Object.keys(result)}, keys: ${Object.keys(result).length}`,
  );
  return result;
};

}
