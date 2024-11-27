// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
    logContext: LogContext,
    headers?: { [key: string]: string | number },
  ): ServiceResult<T> {
    if (logContext.requestId) {
      headers = headers ? headers : {};
      headers[ServiceResult.KMS_REQUEST_ID_HEADER] = logContext.requestId;
    }

    const response = {
      ...(headers && { headers }),
      body,
    };
    Logger.info("Response Succeeded: 200", logContext);
    Logger.debug("Response: ", logContext, response);
    return new ServiceResult<T>(body, undefined, true, 200, headers);
  }

  public static Accepted(
    logContext: LogContext
  ): ServiceResult<string> {
    Logger.debug("Response Accepted: 202", logContext);
    const headers = { "retry-after": 3 };
    if (logContext.requestId) headers[ServiceResult.KMS_REQUEST_ID_HEADER] = logContext.requestId;
    return new ServiceResult<string>(undefined, undefined, true, 202, headers);
  }

  public static Failed<T>(
    error: ErrorResponse,
    statusCode: number = 400,
    logContext: LogContext,
  ): ServiceResult<T> {
    Logger.error(`Failed result: ${statusCode},`, logContext, error);
    const headers = {};
    if (logContext.requestId) headers[ServiceResult.KMS_REQUEST_ID_HEADER] = logContext.requestId;
    if (logContext) error.errorMessage = `${logContext.toString()} ${error.errorMessage}`;
    return new ServiceResult<T>(undefined, error, false, statusCode, headers);
  }
}