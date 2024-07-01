// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
  public readonly body: T | null;
  public readonly error: ErrorResponse | null;
  public readonly headers?: { [key: string]: string | number };

  private constructor(
    body: T | null,
    error: ErrorResponse | null,
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
    console.log("Response Succeeded: ", body);
    console.log("Response headers: ", headers);
    return new ServiceResult<T>(body, null, true, 200, headers);
  }

  public static Accepted(): ServiceResult<string> {
    console.log("Response Accepted");
    return new ServiceResult<string>(undefined, null, true, 202, {
      "retry-after": 3,
    });
  }

  public static Failed<T>(
    error: ErrorResponse,
    statusCode: number = 400,
  ): ServiceResult<T> {
    console.log(`Failed result: ${statusCode}, `, error);
    return new ServiceResult<T>(null, error, false, statusCode);
  }
}
