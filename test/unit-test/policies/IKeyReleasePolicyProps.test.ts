// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import {describe, expect, test} from '@jest/globals';
import { IKeyReleasePolicyProps } from "../../../src";

describe("Test Key Release Policy properties", () => {
  beforeAll(() => {});

  test("Should get all data successfully", () => {
    // Arrange
    const policy: IKeyReleasePolicyProps = {};

    // Act
    policy["x-ms-attestation-type"] = ["sevsnpvm", "none"];

    // Assert
    expect(policy["x-ms-attestation-type"]).toContain("sevsnpvm");
    expect(policy["x-ms-attestation-type"]).toContain("none");
  });
});
