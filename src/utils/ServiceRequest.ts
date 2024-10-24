// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as ccfapp from "@microsoft/ccf-app";
import { ErrorResponse, ServiceResult } from "./ServiceResult";
import { queryParams } from "./Tooling";
import { AuthenticationService } from "../authorization/AuthenticationService";
import { Logger, LogContext } from "./Logger";
import { Settings } from "../policies/Settings";

/**
 * A generic request.
 * Return a dictionary with the request properties.
 * Throw an error if the request is invalid.
 */
export class ServiceRequest<T> {
  public readonly success: boolean;
  public readonly body?: T;
  public readonly headers?: { [key: string]: string };
  public readonly query?: { [key: string]: string };
  public readonly error?: ErrorResponse;
  public readonly requestId?: string;
  private readonly logContext: LogContext;

  constructor(
    public logcontext: LogContext | string,
    public request: ccfapp.Request<T>,
  ) {

    // Set log context if passed in scope string
    if (typeof logcontext === "string") {
      this.logContext = new LogContext().appendScope(logcontext);
    } else {
      this.logContext = logcontext;
    }

    // Set the log level from the settings
    let settings: Settings;
    try {
      settings = Settings.loadSettings();
    } catch (error) {
      const errorMessage = `${this.logContext.getBaseScope()}: Error loading settings: ${error}`;
      Logger.error(errorMessage, this.logContext);
      this.error = {
        errorMessage,
      };
      this.success = false;
      return;
    }

    Logger.setLogLevelFromSettings(settings);
    Settings.logSettings(settings.settings);

    // Set request ID
    this.headers = request.headers;
    const requestIdHeaderList = [
      'x-ms-kms-request-id',
      'x-ms-request-id',
      'x-request-id',
      'request-id',
      'requestid',
    ]
    const requestIdFromHeader = requestIdHeaderList
      .map((header) => this.headers ? this.headers[header] : undefined)
      .find((header) => header !== undefined);
    if (!requestIdFromHeader) {
      this.requestId = Date.now().toString();
      Logger.warn(`Request ID not provided. Using current timestamp as request ID: ${this.requestId}`, this.logContext);
    } else {
      this.requestId = requestIdFromHeader;
    }
    this.logContext.setRequestId(this.requestId);

    // Log request
    Logger.debug(`Request:`, this.logContext, request);
    this.query = queryParams(request, this.logContext);
    if (this.query) {
      Logger.info(`Query:`, this.logContext, this.query);
    }

    if (this.headers) {
      Logger.debug(`Headers:`, this.logContext, this.headers);
    }

    try {
      this.body = request.body.json();
    } catch (exception) {
      this.error = {
        errorMessage: `${this.logContext.getBaseScope()}: No valid JSON request for ${this.logContext.getFormattedScopeString()}`,
      };
      this.success = false;
      return;
    }
    this.success = true;
  }

  /**
   * Checks if the API is authenticated.
   * @returns {boolean} Returns true if the API is authenticated, otherwise false.
   */
  public isAuthenticated(): [
    ccfapp.AuthnIdentityCommon | undefined,
    ServiceResult<string>,
  ] {
    const [policy, isValidIdentity] =
      new AuthenticationService(this.logContext).isAuthenticated(this.request);

    Logger.debug(
      `Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`, this.logContext
    );
    return [policy, isValidIdentity];
  }
}
