// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IAttestationReport } from "./ISnpAttestationReport";
import { ISnpAttestation } from "./ISnpAttestation";
import { Base64 } from "js-base64";
import {
  snp_attestation,
  SnpAttestationResult,
} from "@microsoft/ccf-app/global";
import { SnpAttestationClaims } from "./SnpAttestationClaims";
import { keyReleasePolicyMap } from "../repositories/Maps";
import { getKeyReleasePolicy } from "../utils/Tooling";

// Validate the attestation by means of the key release policy
export const validateAttestation = (
  attestation: ISnpAttestation,
): ServiceResult<string | IAttestationReport> => {
  console.log(`Start attestation validation`);
  if (!attestation) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing attestation" },
      400,
    );
  }
  if (!attestation.evidence && typeof attestation.evidence !== "string") {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.evidence" },
      400,
    );
  }
  if (
    !attestation.endorsements &&
    typeof attestation.endorsements !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.evidence" },
      400,
    );
  }
  if (
    !attestation.uvm_endorsements &&
    typeof attestation.uvm_endorsements !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.uvm_endorsements" },
      400,
    );
  }
  if (
    !attestation.endorsed_tcb &&
    typeof attestation.endorsed_tcb !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.endorsed_tcb" },
      400,
    );
  }
  let evidence: ArrayBuffer;
  let endorsements: ArrayBuffer;
  let uvm_endorsements: ArrayBuffer;

  try {
    evidence = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.evidence));
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: "Malformed attestation.evidence" },
      400,
    );
  }
  try {
    endorsements = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.endorsements));
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: "Malformed attestation.endorsements" },
      400,
    );
  }
  try {
    uvm_endorsements = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.uvm_endorsements));
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: "Malformed attestation.uvm_endorsements" },
      400,
    );
  }
  try {
    const endorsed_tcb = attestation.endorsed_tcb;

    const attestationReport: SnpAttestationResult =
      snp_attestation.verifySnpAttestation(
        evidence,
        endorsements,
        uvm_endorsements,
        endorsed_tcb,
      );
    console.log(
      `Attestation validation report: ${JSON.stringify(attestationReport)}`,
    );

    const claimsProvider = new SnpAttestationClaims(attestationReport);
    const attestationClaims = claimsProvider.getClaims();
    console.log(`Attestation claims: `, attestationClaims);
    console.log(`Report Data: `, attestationClaims["x-ms-sevsnpvm-reportdata"]);

    // Get the key release policy
    const keyReleasePolicy = getKeyReleasePolicy(keyReleasePolicyMap);
    console.log(
      `Key release policy: ${JSON.stringify(
        keyReleasePolicy,
      )}, keys: ${Object.keys(keyReleasePolicy)}, keys: ${
        Object.keys(keyReleasePolicy).length
      }`,
    );

    if (Object.keys(keyReleasePolicy).length === 0) {
      return ServiceResult.Failed<string>(
        {
          errorMessage:
            "The key release policy is missing. Please propose a new key release policy",
        },
        400,
      );
    }

    for (let inx = 0; inx < Object.keys(keyReleasePolicy).length; inx++) {
      const key = Object.keys(keyReleasePolicy)[inx];

      // check if key is in attestation
      const attestationValue = attestationClaims[key];
      const policyValue = keyReleasePolicy[key];
      const isUndefined = typeof attestationValue === "undefined";
      console.log(
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
          console.log(`Check if policy value ${p} === ${attestationValue}`);
          return p === attestationValue;
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
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Internal error: ${exception.message}` },
      500,
    );
  }
};
