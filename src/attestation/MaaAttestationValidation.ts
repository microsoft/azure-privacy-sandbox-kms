// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";
import { ServiceResult } from "../utils/ServiceResult";
import { MaaAttestationClaims } from "./MaaAttestationClaims";
import { Logger, LogContext } from "../utils/Logger";
import { keyReleasePolicyMap } from "../repositories/Maps";
import { KeyReleasePolicy } from "../policies/KeyReleasePolicy";

export class MaaAttestationValidation {
  private logContext: LogContext;

  constructor(public jwtIdentity: ccfapp.JwtAuthnIdentity, logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("MaaAttestationValidation");
  }

  public validateAttestation(): ServiceResult<string | IMaaAttestationReport> {
    let errorMessage = "";
    if (!this.jwtIdentity) {
      errorMessage = "Authentication Policy is not set";
      return ServiceResult.Failed<string>({ errorMessage }, 400, this.logContext);
    }

    const attestation = new MaaAttestationClaims(this.jwtIdentity, this.logContext).getClaims();

    if (attestation === undefined) {
      errorMessage = "Authentication Policy must be set";
      return ServiceResult.Failed<string>({ errorMessage }, 400, this.logContext);
    }

    // Get the key release policy
    const keyReleasePolicy =
      KeyReleasePolicy.getKeyReleasePolicyFromMap(keyReleasePolicyMap, this.logContext);
    Logger.debug(
      `Key release policy: ${JSON.stringify(
        keyReleasePolicy,
      )}, keys: ${Object.keys(keyReleasePolicy)}, keys: ${Object.keys(keyReleasePolicy).length
      }`, this.logContext
    );

    const policyValidationResult = KeyReleasePolicy.validateKeyReleasePolicy(
      keyReleasePolicy,
      attestation,
      this.logContext
    );
    return policyValidationResult;
    return ServiceResult.Succeeded<IMaaAttestationReport>(
      this.jwtIdentity.jwt.payload as IMaaAttestationReport,
      this.logContext
    );
  }
}
