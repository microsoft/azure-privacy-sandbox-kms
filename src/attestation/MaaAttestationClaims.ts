// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";
import { LogContext } from "../utils/Logger";

export class MaaAttestationClaims {
  private logContext: LogContext;

  constructor(public jwtIdentity: ccfapp.JwtAuthnIdentity, logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("MaaAttestationClaims");
  }

  public getClaims(): IMaaAttestationReport {
    if (!this.jwtIdentity) {
      throw new Error(`${this.logContext.toString()}: Authentication Policy is not set`);
    }

    if (this.jwtIdentity.policy !== "jwt") {
      throw new Error(`${this.logContext.toString()}: Authentication Policy must be jwt`);
    }

    if (!this.jwtIdentity.jwt) {
      throw new Error(`${this.logContext.toString()}: Authentication Policy jwt is not set`);
    }

    if (!this.jwtIdentity.jwt.payload) {
      throw new Error(`${this.logContext.toString()}: Authentication Policy jwt payload is not set`);
    }

    return this.jwtIdentity.jwt.payload as IMaaAttestationReport;
  }
}
