// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";
import { ServiceResult } from "../utils/ServiceResult";
import { MaaAttestationClaims } from "./MaaAttestationClaims";
import { Logger } from "../utils/Logger";
import { keyReleasePolicyMap } from "../repositories/Maps";
import { KeyReleasePolicy } from "../policies/KeyReleasePolicy";

export class MaaAttestationValidation {
  constructor(public jwtIdentity: ccfapp.JwtAuthnIdentity) {}

  public validateAttestation(): ServiceResult<string | IMaaAttestationReport> {
    let errorMessage = "";
    if (!this.jwtIdentity) {
      errorMessage = "Authentication Policy is not set";
      return ServiceResult.Failed<string>({ errorMessage }, 400);
    }

    const attestation = new MaaAttestationClaims(this.jwtIdentity).getClaims();

    if (attestation === undefined) {
      errorMessage = "Authentication Policy must be set";
      return ServiceResult.Failed<string>({ errorMessage }, 400);
    }

    // Get the key release policy
    const keyReleasePolicy =
      KeyReleasePolicy.getKeyReleasePolicyFromMap(keyReleasePolicyMap);
    Logger.debug(
      `Key release policy: ${JSON.stringify(
        keyReleasePolicy,
      )}, keys: ${Object.keys(keyReleasePolicy)}, keys: ${
        Object.keys(keyReleasePolicy).length
      }`,
    );

    const policyValidationResult = KeyReleasePolicy.validateKeyReleasePolicy(
      keyReleasePolicy,
      attestation,
    );
    return policyValidationResult;
    return ServiceResult.Succeeded<IMaaAttestationReport>(
      this.jwtIdentity.jwt.payload as IMaaAttestationReport,
    );
  }
}
