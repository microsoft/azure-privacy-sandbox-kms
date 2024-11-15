// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyReleasePolicy, KeyReleasePolicyType } from "./IKeyReleasePolicy";
import { IKeyReleasePolicySnpProps } from "./IKeyReleasePolicySnpProps";
import { Logger, LogContext } from "../utils/Logger";
import { ServiceResult } from "../utils/ServiceResult";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";
import { KmsError } from "../utils/KmsError";

export class KeyReleasePolicy implements IKeyReleasePolicy {
  public type = KeyReleasePolicyType.ADD;
  public claims = {
    "x-ms-attestation-type": ["snp"],
  };

  private static validateKeyReleasePolicyClaims(
    keyReleasePolicyClaims: IKeyReleasePolicySnpProps,
    attestationClaims: IAttestationReport,
    logContext?: LogContext,
  ): ServiceResult<string | IAttestationReport> {
    if (
      keyReleasePolicyClaims === null ||
      keyReleasePolicyClaims === undefined
    ) {
      return ServiceResult.Failed<string>(
        { errorMessage: "Missing key release policy" },
        500,
        logContext,
      );
    }
    if (attestationClaims === null || attestationClaims === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: "Missing attestation claims" },
        500,
        logContext,
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
        logContext
      );
      if (isUndefined) {
        return ServiceResult.Failed<string>(
          { errorMessage: `Missing claim in attestation: ${key}` },
          400,
          logContext,
        );
      }
      if (
        policyValue.filter((p) => {
          Logger.debug(`Check if policy value ${p} === ${attestationValue}`, logContext);
          return p.toString() === attestationValue.toString();
        }).length === 0
      ) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Attestation claim ${key}, value ${attestationValue} does not match policy values: ${policyValue}`,
          },
          400,
          logContext,
        );
      }
    }
    return ServiceResult.Succeeded<IAttestationReport>(attestationClaims, undefined, logContext);
  }

  private static validateKeyReleasePolicyOperators(
    type: string,
    keyReleasePolicyClaims: IKeyReleasePolicySnpProps,
    attestationClaims: IAttestationReport,
    logContext?: LogContext,
  ): ServiceResult<string | IAttestationReport> {
    if (
      keyReleasePolicyClaims === null ||
      keyReleasePolicyClaims === undefined
    ) {
      return ServiceResult.Failed<string>(
        { errorMessage: "Missing key release policy" },
        500,
        logContext,
      );
    }
    if (attestationClaims === null || attestationClaims === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: "Missing attestation claims" },
        500,
        logContext,
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
        logContext
      );
      if (isUndefined) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Missing claim in attestation: ${key} for operator type ${type}`,
          },
          400,
          logContext,
        );
      }
      if (policyValue === null || policyValue === undefined) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Missing policy value for claim ${key} for operator type ${type}`,
          },
          500,
          logContext,
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
          logContext,
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
          logContext,
        );
      }

      if (typeof attestationValue !== "number") {
        attestationValue = parseFloat(attestationValue);
      }

      if (gte) {
        Logger.info(
          `Checking if attestation value ${attestationValue} is greater than or equal to policy value ${policyValue}`,
          logContext,
        );
        if (attestationValue >= policyValue === false) {
          return ServiceResult.Failed<string>(
            {
              errorMessage: `Attestation claim ${key}, value ${attestationValue} is not greater than or equal to policy value ${policyValue}`,
            },
            400,
            logContext,
          );
        }
      } else {
        Logger.info(
          `Checking if attestation value ${attestationValue} is greater than policy value ${policyValue}`,
          logContext,
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
    return ServiceResult.Succeeded<IAttestationReport>(attestationClaims, undefined, logContext);
  }

  public static validateKeyReleasePolicy(
    keyReleasePolicy: IKeyReleasePolicy,
    attestationClaims: IAttestationReport,
    logContextIn?: LogContext,
  ): ServiceResult<string | IAttestationReport> {
    const logContext = (logContextIn?.clone() || new LogContext()).appendScope("validateKeyReleasePolicy");
    // claims are mandatory
    if (Object.keys(keyReleasePolicy.claims).length === 0) {
      return ServiceResult.Failed<string>(
        {
          errorMessage:
            "The claims in the key release policy are missing. Please propose a new key release policy",
        },
        400,
        logContext,
      );
    }

    // Check claims
    let policyValidationResult =
      KeyReleasePolicy.validateKeyReleasePolicyClaims(
        keyReleasePolicy.claims,
        attestationClaims,
        logContext
      );
    if (!policyValidationResult.success) {
      return policyValidationResult;
    }

    // Check operators gte and gt
    if (keyReleasePolicy.gte !== null && keyReleasePolicy.gte !== undefined) {
      Logger.info(`Validating gte operator`, logContext, keyReleasePolicy.gte);
      policyValidationResult =
        KeyReleasePolicy.validateKeyReleasePolicyOperators(
          "gte",
          keyReleasePolicy.gte,
          attestationClaims,
        );
    }
    if (keyReleasePolicy.gt !== null && keyReleasePolicy.gt !== undefined) {
      Logger.info(`Validating gt operator`, logContext, keyReleasePolicy.gt);
      policyValidationResult =
        KeyReleasePolicy.validateKeyReleasePolicyOperators(
          "gt",
          keyReleasePolicy.gt,
          attestationClaims,
          logContext
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
    logContextIn?: LogContext,
  ): IKeyReleasePolicy => {
    const logContext = (logContextIn?.clone() || new LogContext()).appendScope("getKeyReleasePolicyFromMap");
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
          throw new KmsError(`Key release policy ${kvKey} not found in the key release policy map`, logContext);        }
      } else {
        let kvValue = ccf.bufToStr(kvValueBuf!);
        try {
          keyReleasePolicy[kvKey] = JSON.parse(
            kvValue,
          ) as IKeyReleasePolicySnpProps;
        } catch (error) {
          throw new KmsError(`Key release policy ${kvKey} is not a valid JSON object: ${kvValue}`, logContext);        }
      }
    });

    Logger.info(`Resulting key release policy: `, logContext, keyReleasePolicy);
    return keyReleasePolicy;
  };
}
