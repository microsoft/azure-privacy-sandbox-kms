// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { Logger, LogContext } from "./Logger";

/**
 * Converts a Uint8Array to a string representation.
 * @param uInt8array - The Uint8Array to convert.
 * @returns The string representation of the Uint8Array.
 */
export const convertUint8ArrayToString = (uInt8array: Uint8Array): string => {
  let stringRepresentation = "";
  for (let i = 0; i < uInt8array.length; i++) {
    stringRepresentation += String.fromCharCode(uInt8array[i]);
  }
  return stringRepresentation;
};

/**
 * Converts an ArrayBuffer to a hexadecimal string representation.
 * @param buf - The ArrayBuffer to convert.
 * @returns The hexadecimal string representation of the ArrayBuffer.
 */
export const arrayBufferToHex = (buf: ArrayBuffer) => {
  return Array.from(new Uint8Array(buf))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Parses query parameters from a request.
 * @param request - The request object containing the query parameters.
 * @returns An object representing the parsed query parameters.
 */
export const queryParams = (request: ccfapp.Request, logContextIn?: LogContext) => {
  const logContext = (logContextIn?.clone() || new LogContext()).appendScope("queryParams");
  const elements = request.query.split("&");
  let obj = {};
  for (let inx = 0; inx < elements.length; inx++) {
    const param = elements[inx].split("=");
    obj[param[0]] = param[1];
    Logger.debug(`Query: ${param[0]} = ${param[1]}`, logContext);
  }
  return obj;
};

/**
 * Checks if a given string represents a PEM public key.
 * @param key - The PEM key to be checked.
 * @returns A boolean indicating whether the string is a PEM public key.
 */
export const isPemPublicKey = (key: string, logContextIn?: LogContext): boolean => {
  const logContext = (logContextIn?.clone() || new LogContext()).appendScope("isPemPublicKey");
  const beginPatternLiteral = /-----BEGIN PUBLIC KEY-----\\n/;
  const endPatternLiteral = /\\n-----END PUBLIC KEY-----\\n$/;
  const beginPatternNewline = /-----BEGIN PUBLIC KEY-----\n/;
  const endPatternNewline = /\n-----END PUBLIC KEY-----\n$/;

  const isLiteralNewline =
    beginPatternLiteral.test(key) && endPatternLiteral.test(key);
  const isNewline =
    beginPatternNewline.test(key) && endPatternNewline.test(key);

  Logger.debug("isLiteralNewline:", logContext, isLiteralNewline);
  Logger.debug("isNewline:", logContext, isNewline);

  return isLiteralNewline || isNewline;
};

/**
 * Sets the key headers.
 * @returns An object containing the key headers.
 */
export const setKeyHeaders = (): { [key: string]: string } => {
  const headers: { [key: string]: string } = {
    "cache-control": "max-age=254838",
    date: new Date().toUTCString(),
  };
  return headers;
};

/**
 * Enables the endpoint.
 * @remarks
 * This function enables untrusted date and time for the endpoint.
 * @throws Will eat a throw because it is needed for unit tests.
 */
export const enableEndpoint = () => {
  // Set CCF state for date and time
  try {
    ccf.enableUntrustedDateTime(true);
  } catch {
    // Will fail for unit tests. Do nothing
  }
};

/**
 * Converts an ArrayBuffer to a hexadecimal string representation.
 *
 * @param buf - The ArrayBuffer to convert.
 * @returns The hexadecimal string representation of the ArrayBuffer.
 */
export const aToHex = (buf: ArrayBuffer) => {
  return Array.from(new Uint8Array(buf))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
};