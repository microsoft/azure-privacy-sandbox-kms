// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";
import { LogContext } from "../utils/Logger";
import { KmsError } from "../utils/KmsError";

export class MaaAttestationClaims {
  private logContext: LogContext;

  constructor(public jwtIdentity: ccfapp.JwtAuthnIdentity, logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("MaaAttestationClaims");
  }

  public getClaims(): IMaaAttestationReport {
    if (!this.jwtIdentity) {
      throw new KmsError("Authentication Policy is not set", this.logContext);
    }

    if (this.jwtIdentity.policy !== "jwt") {
      throw new KmsError("Authentication Policy must be jwt", this.logContext);
    }

    if (!this.jwtIdentity.jwt) {
      throw new KmsError("Authentication Policy jwt is not set", this.logContext);
    }

    if (!this.jwtIdentity.jwt.payload) {
      throw new KmsError("Authentication Policy jwt payload is not set", this.logContext);
    }

    return this.jwtIdentity.jwt.payload as IMaaAttestationReport;
  }
}
