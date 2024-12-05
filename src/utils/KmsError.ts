// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogContext } from "./Logger";

/**
 * KmsError is a custom error class that extends the built-in Error class.
 * It is used to throw errors with an optional log context.
 */
export class KmsError extends Error {
    constructor(message: string, public logContext?: LogContext) {
        if (logContext?.isLogContext) {
            message = logContext.toString() + " " + message;
        }
        super(message);
    }

    public toString() {
        return `${this.name}: ${this.message}`;
    }
}