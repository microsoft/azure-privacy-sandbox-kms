// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyReleasePolicy, KeyReleasePolicyType } from "./IKeyReleasePolicy";
import { IKeyReleasePolicySnpProps } from "./IKeyReleasePolicySnpProps";
import { Logger } from "../utils/Logger";
import { ServiceResult } from "../utils/ServiceResult";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";

export class KeyReleasePolicy implements IKeyReleasePolicy {
  public type = KeyReleasePolicyType.ADD;
  public claims = {
    "x-ms-attestation-type": ["snp"],
  };

  private static validateKeyReleasePolicyClaims(
    keyReleasePolicyClaims: IKeyReleasePolicySnpProps,
    attestationClaims: IAttestationReport,
  ): ServiceResult<string | IAttestationReport> {
    if (
      keyReleasePolicyClaims === null ||
      keyReleasePolicyClaims === undefined
    ) {
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

    for (let inx = 0; inx < Object.keys(keyReleasePolicyClaims).length; inx++) {
      const key = Object.keys(keyReleasePolicyClaims)[inx];

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

  private static validateKeyReleasePolicyOperators(
    type: string,
    keyReleasePolicyClaims: IKeyReleasePolicySnpProps,
    attestationClaims: IAttestationReport,
  ): ServiceResult<string | IAttestationReport> {
    if (
      keyReleasePolicyClaims === null ||
      keyReleasePolicyClaims === undefined
    ) {
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
    const gte = type === "gte";
    for (let inx = 0; inx < Object.keys(keyReleasePolicyClaims).length; inx++) {
      const key = Object.keys(keyReleasePolicyClaims)[inx];

      // check if key is in attestation
      let attestationValue = attestationClaims[key];
      let policyValue = keyReleasePolicyClaims[key];
      const isUndefined = typeof attestationValue === "undefined";
      Logger.debug(
        `Checking key ${key}, typeof attestationValue: ${typeof attestationValue}, isUndefined: ${isUndefined}, attestation value: ${attestationValue}, policyValue: ${policyValue}`,
      );
      if (isUndefined) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Missing claim in attestation: ${key} for operator type ${type}`,
          },
          400,
        );
      }
      if (policyValue === null || policyValue === undefined) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Missing policy value for claim ${key} for operator type ${type}`,
          },
          500,
        );
      }
      if (
        typeof policyValue !== "number" &&
        (typeof policyValue !== "string" || isNaN(parseFloat(policyValue)))
      ) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Policy value for claim ${key} is not a number or a string representing a number for operator type ${type}`,
          },
          400,
        );
      }

      if (typeof policyValue !== "number") {
        policyValue = parseFloat(policyValue);
      }

      if (typeof policyValue !== "number") {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Policy value for claim ${key} is not a number or a string representing a number for operator type ${type} after conversion`,
          },
          400,
        );
      }

      if (typeof attestationValue !== "number") {
        attestationValue = parseFloat(attestationValue);
      }

      if (gte) {
        Logger.info(
          `Checking if attestation value ${attestationValue} is greater than or equal to policy value ${policyValue}`,
        );
        if (attestationValue >= policyValue === false) {
          return ServiceResult.Failed<string>(
            {
              errorMessage: `Attestation claim ${key}, value ${attestationValue} is not greater than or equal to policy value ${policyValue}`,
            },
            400,
          );
        }
      } else {
        Logger.info(
          `Checking if attestation value ${attestationValue} is greater than policy value ${policyValue}`,
        );
        if (attestationValue > policyValue === false) {
          return ServiceResult.Failed<string>(
            {
              errorMessage: `Attestation claim ${key}, value ${attestationValue} is not greater than policy value ${policyValue}`,
            },
            400,
          );
        }
      }
    }
    return ServiceResult.Succeeded<IAttestationReport>(attestationClaims);
  }

  public static validateKeyReleasePolicy(
    keyReleasePolicy: IKeyReleasePolicy,
    attestationClaims: IAttestationReport,
  ): ServiceResult<string | IAttestationReport> {
    // claims are mandatory
    if (Object.keys(keyReleasePolicy.claims).length === 0) {
      return ServiceResult.Failed<string>(
        {
          errorMessage:
            "The claims in the key release policy are missing. Please propose a new key release policy",
        },
        400,
      );
    }

    // Check claims
    let policyValidationResult =
      KeyReleasePolicy.validateKeyReleasePolicyClaims(
        keyReleasePolicy.claims,
        attestationClaims,
      );
    if (!policyValidationResult.success) {
      return policyValidationResult;
    }

    // Check operators gte and gt
    if (keyReleasePolicy.gte !== null && keyReleasePolicy.gte !== undefined) {
      Logger.info(`Validating gte operator`, keyReleasePolicy.gte);
      policyValidationResult =
        KeyReleasePolicy.validateKeyReleasePolicyOperators(
          "gte",
          keyReleasePolicy.gte,
          attestationClaims,
        );
    }
    if (keyReleasePolicy.gt !== null && keyReleasePolicy.gt !== undefined) {
      Logger.info(`Validating gt operator`, keyReleasePolicy.gt);
      policyValidationResult =
        KeyReleasePolicy.validateKeyReleasePolicyOperators(
          "gt",
          keyReleasePolicy.gt,
          attestationClaims,
        );
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
    const keyReleasePolicy: IKeyReleasePolicy = {
      type: KeyReleasePolicyType.ADD,
      claims: {},
    };

    [
      { kvkey: "claims", optional: false },
      { kvkey: "gte", optional: true },
      { kvkey: "gt", optional: true },
    ].forEach((kv) => {
      const kvKey = kv.kvkey;
      const kvKeyBuf = ccf.strToBuf(kvKey);
      const kvValueBuf = keyReleasePolicyMap.get(kvKeyBuf);
      if (!kvValueBuf) {
        if (!kv.optional) {
          throw new Error(
            `Key release policy ${kvKey} not found in the key release policy map`,
          );
        }
      } else {
        let kvValue = ccf.bufToStr(kvValueBuf!);
        try {
          keyReleasePolicy[kvKey] = JSON.parse(
            kvValue,
          ) as IKeyReleasePolicySnpProps;
        } catch (error) {
          throw new Error(
            `Key release policy ${kvKey} is not a valid JSON object: ${kvValue}`,
          );
        }
      }
    });

    Logger.info(`Resulting key release policy: `, keyReleasePolicy);
    return keyReleasePolicy;
  };
}
