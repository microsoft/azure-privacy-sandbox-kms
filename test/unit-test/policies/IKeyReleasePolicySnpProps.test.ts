// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import { describe, expect, test } from "@jest/globals";
import { IKeyReleasePolicySnpProps } from "../../../src";
import { KeyReleasePolicy } from "../../../src/policies/KeyReleasePolicy";
import { Logger, LogLevel } from "../../../src/utils/Logger";
import { IAttestationReport } from "../../../src/attestation/ISnpAttestationReport";
import { IKeyReleasePolicy } from "../../../src/policies/IKeyReleasePolicy";

describe("Test Key Release Policy properties", () => {
  test("Should get all data successfully", () => {
    // Arrange
    const policy: IKeyReleasePolicySnpProps = {};

    // Act
    policy["x-ms-attestation-type"] = ["sevsnpvm", "none"];

    // Assert
    expect(policy["x-ms-attestation-type"]).toContain("sevsnpvm");
    expect(policy["x-ms-attestation-type"]).toContain("none");
  });

  describe("Validate Key Release Policy properties", () => {
    test("Should validate successfully", () => {
      // Arrange
      Logger.setLogLevel(LogLevel.DEBUG);
      const policy: IKeyReleasePolicy = {type: "", claims: { "x-ms-attestation-type": ["sevsnpvm"] }};
      const attestationClaims: IAttestationReport = { "x-ms-attestation-type": "sevsnpvm" };

      // Act
      const validationResult = KeyReleasePolicy.validateKeyReleasePolicy(policy, attestationClaims);

      // Debugging statements
      console.log("Policy:", policy);
      console.log("Attestation Claims:", attestationClaims);
      console.log("Validation Result:", validationResult);

      // Assert
      expect(validationResult.success).toBe(true);
    });
  });
});
