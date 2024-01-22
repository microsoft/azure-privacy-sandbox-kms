// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import { describe, expect, test } from "@jest/globals";
import { ITinkKeySet, KeyGeneration, TinkKey } from "../../../src";

describe("Construct a new tink key set", () => {
  beforeAll(() => {});

  test("Should create a tink key successfully", () => {
    // Arrange
    const keyItem = KeyGeneration.generateKeyItem();

    // Act
    const tinkKey = new TinkKey([keyItem]).get();

    // Assert
    console.log(`Serialized tink key: ${new TinkKey([keyItem]).serialized()}`);
    expect(tinkKey.key.length).toEqual(1);
    expect(
      tinkKey.key[0].keyData.typeUrl ===
        "https://schema.org/PublicKey/Azure/HpkePublicKey",
    );
    expect(tinkKey.key[0].keyData.keyMaterialType === "ASYMMETRIC_PUBLIC");
    expect(tinkKey.key[0].keyData.status === "ENABLED");
    expect(tinkKey.key[0].keyData.outputPrefixType === "RAW");
  });

  test("Should serialize a tink key successfully", () => {
    // Arrange
    const keyItem = KeyGeneration.generateKeyItem();
    // Act
    const serialized = new TinkKey([keyItem]).serialized();
    const tinkKey = JSON.parse(serialized) as ITinkKeySet;

    // Assert
    console.log(`Serialized tink key: ${serialized}`);
    expect(
      tinkKey.key[0].keyData.typeUrl ===
        "https://schema.org/PublicKey/Azure/HpkePublicKey",
    );
    expect(tinkKey.key[0].keyData.keyMaterialType === "ASYMMETRIC_PUBLIC");
    expect(tinkKey.key[0].keyData.status === "ENABLED");
    expect(tinkKey.key[0].keyData.outputPrefixType === "RAW");
  });
});
