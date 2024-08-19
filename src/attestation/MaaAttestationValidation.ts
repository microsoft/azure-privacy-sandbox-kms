// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";
import { ServiceResult } from "../utils/ServiceResult";
import { MaaAttestationClaims } from "./MaaAttestationClaims";

export class MaaAttestationValidation {
    constructor(public jwtIdentity: ccfapp.JwtAuthnIdentity) { }

    public validateAttestation(): ServiceResult<string | IMaaAttestationReport> {
        let errorMessage = "";
        if (!this.jwtIdentity) {
            errorMessage = "Authentication Policy is not set";
            return ServiceResult.Failed<string>(
                { errorMessage },
                400,
            );
        }

        const claims = new MaaAttestationClaims(this.jwtIdentity).getClaims();

        if (claims === undefined) {
            errorMessage = "Authentication Policy must be set";
            return ServiceResult.Failed<string>(
                { errorMessage },
                400,
            );
        }

        return ServiceResult.Succeeded<IMaaAttestationReport>(this.jwtIdentity.jwt.payload as IMaaAttestationReport);
    }
}