// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";

export class MaaAttestationClaims {
  constructor(public jwtIdentity: ccfapp.JwtAuthnIdentity ) {}

  public getClaims(): IMaaAttestationReport {

    if (!this.jwtIdentity) {
      throw new Error("Authentication Policy is not set");
    }

    if (this.jwtIdentity.policy !== "jwt") {
      throw new Error("Authentication Policy must be jwt");
    }

    if (!this.jwtIdentity.jwt) {
      throw new Error("Authentication Policy jwt is not set");
    } 

    if (!this.jwtIdentity.jwt.payload) {
      throw new Error("Authentication Policy jwt payload is not set");
    } 

    return this.jwtIdentity.jwt.payload as IMaaAttestationReport;
  }
}
