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
import { Logger, LogContext } from "../utils/Logger";
import { KeyReleasePolicy } from "../policies/KeyReleasePolicy";

// Validate the attestation by means of the key release policy
export const validateAttestation = (
  attestation: ISnpAttestation,
): ServiceResult<string | IAttestationReport> => {
  const logContext = new LogContext({ scope: "validateAttestation" });
  Logger.debug(`Start attestation validation`, logContext);
  if (!attestation) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing attestation" },
      400,
      logContext
    );
  }
  if (!attestation.evidence && typeof attestation.evidence !== "string") {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.evidence" },
      400,
      logContext
    );
  }
  if (
    !attestation.endorsements &&
    typeof attestation.endorsements !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.evidence" },
      400,
      logContext
    );
  }
  if (
    !attestation.uvm_endorsements &&
    typeof attestation.uvm_endorsements !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.uvm_endorsements" },
      400,
      logContext
    );
  }
  if (
    !attestation.endorsed_tcb &&
    typeof attestation.endorsed_tcb !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.endorsed_tcb" },
      400,
      logContext
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
      logContext
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
      logContext
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
      logContext
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
    Logger.debug(
      `Attestation validation report: ${JSON.stringify(attestationReport)}`, logContext
    );

    const claimsProvider = new SnpAttestationClaims(attestationReport);
    const attestationClaims = claimsProvider.getClaims();
    Logger.debug(`Attestation claims: `, logContext, attestationClaims);
    Logger.debug(
      `Report Data: `, logContext,
      attestationClaims["x-ms-sevsnpvm-reportdata"],
    );

    // Get the key release policy
    const keyReleasePolicy =
      KeyReleasePolicy.getKeyReleasePolicyFromMap(keyReleasePolicyMap);
    Logger.debug(
      `Key release policy: ${JSON.stringify(
        keyReleasePolicy,
      )}, keys: ${
        Object.keys(keyReleasePolicy)}, keys: ${Object.keys(keyReleasePolicy).length
      }`, logContext
    );

    const policyValidationResult = KeyReleasePolicy.validateKeyReleasePolicy(
      keyReleasePolicy,
      attestationClaims,
    );
    return policyValidationResult;
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Internal error: ${exception.message}` },
      500,
      logContext
    );
  }
};
