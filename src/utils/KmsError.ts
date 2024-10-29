// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogContext } from "./Logger";

/**
 * KmsError is a custom error class that extends the built-in Error class.
 * It is used to throw errors with an optional log context.
 */
export class KmsError extends Error {
    public readonly logContext?: LogContext;

    constructor(message: string, logContext?: LogContext) {
        if (logContext) {
            message = logContext.toString() + " " + message;
        }
        super(message);
    }
}