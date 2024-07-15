// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger } from "./Logger";

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
  ): ServiceResult<T> {
    Logger.debug("Response Succeeded: ", body);
    if (headers) {
      Logger.debug("Response headers: ", headers);
    }

    return new ServiceResult<T>(body, undefined, true, 200, headers);
  }

  public static Accepted(): ServiceResult<string> {
    Logger.debug("Response Accepted");
    return new ServiceResult<string>(undefined, undefined, true, 202, {
      "retry-after": 3,
    });
  }

  public static Failed<T>(
    error: ErrorResponse,
    statusCode: number = 400,
  ): ServiceResult<T> {
    Logger.error(`Failed result: ${statusCode}, `, error);
    return new ServiceResult<T>(undefined, error, false, statusCode);
  }
}
