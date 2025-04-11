// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { decode } from "cbor-x";
import { LogContext, Logger } from "../utils/Logger";

function parseCoseDocument(coseArrayBuffer: ArrayBuffer): any[] {
    const logContext = new LogContext();

    let coseUint8Array: Uint8Array;
    try {
        coseUint8Array = new Uint8Array(coseArrayBuffer);
    } catch (error) {
        Logger.error(`Failed to parse COSE array buffer to a Uint8 Array: ${error}`, logContext);
        throw error;
    }

    let decodedCose: any;
    try {
        decodedCose = decode(coseUint8Array);
    } catch (error) {
        Logger.error(`Failed to decode COSE document: ${error}`, logContext);
        throw error;
    }
    Logger.info("Decoded COSE document", logContext);

    return decodedCose.value;
}

export function getCoseProtectedHeader(coseArrayBuffer: ArrayBuffer): Record<string, any> {
    const logContext = new LogContext();

    let decodedCose: any[];
    try {
        decodedCose = parseCoseDocument(coseArrayBuffer);
    } catch (error) {
        Logger.error(`Failed to parse COSE document: ${error}`, logContext);
        throw error;
    }


    const protectedHeaderBytes = decodedCose[0];
    if (protectedHeaderBytes && protectedHeaderBytes.length > 0) {
        return decode(protectedHeaderBytes) as Record<string, any>;
    } else {
        throw new Error("No protected header provided or it is empty");
    }
}