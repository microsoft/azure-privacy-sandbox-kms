// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import { describe, expect, test } from "@jest/globals";
import { convertUint8ArrayToString, arrayBufferToHex } from "../../../src";

describe("Test Tooling", () => {
  test("Should do convertUint8ArrayToString successfully", () => {
    // Arrange
    const buf = Buffer.from("ABC");

    // Act
    const str = convertUint8ArrayToString(new Uint8Array(buf));

    // Assert
    expect(str === "414243");
  });

  test("Should do arrayBufferToHex successfully", () => {
    // Arrange
    const buf = Buffer.from("ABC");

    // Act
    const str = arrayBufferToHex(buf);

    // Assert
    expect(str === "414243");
  });
});
