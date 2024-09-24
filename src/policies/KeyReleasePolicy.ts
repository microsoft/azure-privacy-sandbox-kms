// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyReleasePolicy } from "./IKeyReleasePolicy";
import { IKeyReleasePolicySnpProps } from "./IKeyReleasePolicySnpProps";
import { Logger } from "../utils/Logger";
import { ServiceResult } from "../utils/ServiceResult";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";

export class KeyReleasePolicy implements IKeyReleasePolicy {
  public type = "add";
  public claims = {
    "x-ms-attestation-type": ["snp"],
  };

  private static validateKeyReleasePolicyClaims(keyReleasePolicyClaims: IKeyReleasePolicySnpProps, attestationClaims: IAttestationReport): ServiceResult<string | IAttestationReport> {
    if (keyReleasePolicyClaims === null || keyReleasePolicyClaims === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: "Missing key release policy" },
        500,
      );
    }
    if (attestationClaims === null || attestationClaims === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: "Missing attestation claims" },
        500,
      );
    }

    const claims = keyReleasePolicyClaims;
    for (let inx = 0; inx < Object.keys(claims).length; inx++) {
      const key = Object.keys(claims)[inx];

      // check if key is in attestation
      const attestationValue = attestationClaims[key];
      const policyValue = keyReleasePolicyClaims[key];
      const isUndefined = typeof attestationValue === "undefined";
      Logger.debug(
        `Checking key ${key}, typeof attestationValue: ${typeof attestationValue}, isUndefined: ${isUndefined}, attestation value: ${attestationValue}, policyValue: ${policyValue}`,
      );
      if (isUndefined) {
        return ServiceResult.Failed<string>(
          { errorMessage: `Missing claim in attestation: ${key}` },
          400,
        );
      }
      if (
        policyValue.filter((p) => {
          Logger.debug(`Check if policy value ${p} === ${attestationValue}`);
          return p.toString() === attestationValue.toString();
        }).length === 0
      ) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Attestation claim ${key}, value ${attestationValue} does not match policy values: ${policyValue}`,
          },
          400,
        );
      }
    }
    return ServiceResult.Succeeded<IAttestationReport>(attestationClaims);
  }

public static validateKeyReleasePolicy(keyReleasePolicy: IKeyReleasePolicy, attestationClaims: IAttestationReport): ServiceResult<string | IAttestationReport> {
  const policyValidationResult = KeyReleasePolicy.validateKeyReleasePolicyClaims(keyReleasePolicy.claims, attestationClaims);
  if (!policyValidationResult.success) {
    return policyValidationResult;
  }

  return policyValidationResult;
}

/**
 * Retrieves the key release policy from a key release policy map.
 * @param keyReleasePolicyMap - The key release policy map.
 * @returns The key release policy as an object.
 */
public static getKeyReleasePolicyFromMap = (
  keyReleasePolicyMap: ccfapp.KvMap,
): IKeyReleasePolicy => {
  let keyReleasePolicy: IKeyReleasePolicy = { type: "", claims: {} };
  let kvKey = "claims"
  let kvKeyBuf = ccf.strToBuf(kvKey);
  let kvValueBuf = keyReleasePolicyMap.get(kvKeyBuf);
  if (!kvValueBuf) {
    throw new Error("Key release policy claims not found in the key release policy map");
  }
  let kvValue = ccf.bufToStr(kvValueBuf);
  keyReleasePolicy[kvKey] = JSON.parse(kvValue) as IKeyReleasePolicySnpProps;


  Logger.info(`Resulting key release policy: `, keyReleasePolicy);
  return keyReleasePolicy;
};

}
