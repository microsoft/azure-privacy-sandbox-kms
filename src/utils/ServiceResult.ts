// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { log } from "console";
import { Logger, LogContext } from "./Logger";

export interface ErrorResponse {
  errorMessage: string;
  errorType?: string;
  details?: unknown;
}

/**
 * A generic result pattern implementation.
 * Instead of returning the result directly, which can be an error or data itself,
 * we wrap them with a meaningful state: Success or Failure
 */
export class ServiceResult<T> {
  public readonly success: boolean;
  public readonly failure: boolean;
  public readonly statusCode: number;
  public readonly status: string;
  public readonly body: T | undefined;
  public readonly error: ErrorResponse | undefined;
  public readonly headers?: { [key: string]: string | number };
  public static readonly KMS_REQUEST_ID_HEADER: string = "x-ms-kms-request-id";

  private constructor(
    body: T | undefined,
    error: ErrorResponse | undefined,
    success: boolean = false,
    statusCode: number,
    headers?: { [key: string]: string | number },
  ) {
    this.body = body;
    this.error = error;
    this.success = success;
    this.failure = !success;
    this.statusCode = statusCode;
    this.status = success ? "Success" : "Error";
    this.headers = headers ? headers : {};
  }

  public static Succeeded<T>(
    body: T,
    headers?: { [key: string]: string | number },
    logContext?: LogContext,
    requestId?: string,
  ): ServiceResult<T> {
    if (requestId) {
      headers = headers ? headers : {};
      headers[ServiceResult.KMS_REQUEST_ID_HEADER] = requestId;
    }

    const response = {
      ...(headers && { headers }),
      body,
    };
    Logger.info("Response Succeeded: 200", logContext, response);
    return new ServiceResult<T>(body, undefined, true, 200, headers);
  }

  public static Accepted(
    logContext?: LogContext,
    requestId?: string,
  ): ServiceResult<string> {
    Logger.info("Response Accepted: 202", logContext);
    const headers = { "retry-after": 3 };
    if (requestId) headers[ServiceResult.KMS_REQUEST_ID_HEADER] = requestId;
    return new ServiceResult<string>(undefined, undefined, true, 202, headers);
  }

  public static Failed<T>(
    error: ErrorResponse,
    statusCode: number = 400,
    logContext?: LogContext,
    requestId?: string,
  ): ServiceResult<T> {
    Logger.error(`Failed result: ${statusCode},`, logContext, error);
    const headers = {};
    if (requestId) headers[ServiceResult.KMS_REQUEST_ID_HEADER] = requestId;
    if (logContext) error.errorMessage = `${logContext.toString()} ${error.errorMessage}`;
    return new ServiceResult<T>(undefined, error, false, statusCode, headers);
  }
}
