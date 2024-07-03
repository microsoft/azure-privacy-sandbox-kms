// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import { describe, expect, test } from "@jest/globals";
import {
  convertUint8ArrayToString,
  arrayBufferToHex,
  queryParams,
  isPemPublicKey,
  setKeyHeaders,
  aToHex,
} from "../../../src";
import fs from "fs";

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

test("Should parse query parameters successfully", () => {
  // Arrange
  const request = {
    query: "param1=value1&param2=value2&param3=value3",
  };

  // Act
  const result = queryParams(<any>request);

  // Assert
  expect(result).toEqual({
    param1: "value1",
    param2: "value2",
    param3: "value3",
  });
});

test("Should detect public PEM key", () => {
  // Arrange
  const pem = fs.readFileSync("test/data-samples/publicWrapKey.pem", "utf8");

  // Act
  const result = isPemPublicKey(pem);

  // Assert
  expect(result).toEqual(true);
});

test("Should detect private PEM key", () => {
  // Arrange
  const pem = fs.readFileSync("test/data-samples/privateWrapKey.pem", "utf8");

  // Act
  const result = isPemPublicKey(pem);

  // Assert
  expect(result).toEqual(false);
});

test("Should set key headers correctly", () => {
  // Act
  const headers = setKeyHeaders();

  // Assert
  expect(headers).toEqual({
    "cache-control": "max-age=254838",
    date: expect.any(String),
  });
});

test("Should convert to hex", () => {
  // Arrange
  const arrayBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;

  // Act
  const result = aToHex(arrayBuffer);

  // Assert
  expect(result).toEqual("0102030405060708");
});
