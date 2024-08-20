// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as ccfapp from "@microsoft/ccf-app";
import { IMaaAttestationReport } from "./IMaaAttestationReport";
import { ServiceResult } from "../utils/ServiceResult";
import { MaaAttestationClaims } from "./MaaAttestationClaims";
import { getKeyReleasePolicy } from "../utils/Tooling";
import { Logger } from "../utils/Logger";
import { keyReleasePolicyMap } from "../repositories/Maps";

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

        const attestation = new MaaAttestationClaims(this.jwtIdentity).getClaims();

        if (attestation === undefined) {
            errorMessage = "Authentication Policy must be set";
            return ServiceResult.Failed<string>(
                { errorMessage },
                400,
            );
        }

        // Get the key release policy
        const keyReleasePolicy = getKeyReleasePolicy(keyReleasePolicyMap);
        Logger.debug(
            `Key release policy: ${JSON.stringify(
                keyReleasePolicy,
            )}, keys: ${Object.keys(keyReleasePolicy)}, keys: ${Object.keys(keyReleasePolicy).length
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
            const attestationValue = attestation[key];
            const policyValue = keyReleasePolicy[key];
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
        
        return ServiceResult.Succeeded<IMaaAttestationReport>(this.jwtIdentity.jwt.payload as IMaaAttestationReport);
    }
}