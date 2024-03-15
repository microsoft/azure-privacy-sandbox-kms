// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// uint8array to string
export const convertUint8ArrayToString = (uInt8array: Uint8Array): string => {
  let stringRepresentation = "";
  for (let i = 0; i < uInt8array.length; i++) {
    stringRepresentation += String.fromCharCode(uInt8array[i]);
  }
  return stringRepresentation;
};

// ArrayBuffer to hex
export const arrayBufferToHex = (buf: ArrayBuffer) => {
  return Array.from(new Uint8Array(buf))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
