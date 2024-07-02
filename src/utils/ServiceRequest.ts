// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as ccfapp from "@microsoft/ccf-app";
import { ErrorResponse, ServiceResult } from "./ServiceResult";
import { queryParams } from "./Tooling";
import { AuthenticationService } from "../authorization/AuthenticationService";

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

  constructor(public name: string, public request: ccfapp.Request<T>) {
    console.log(`${name} Request: `, request);
    this.query = queryParams(request);
    if (this.query) {
      console.log(`${name} query: `, this.query);
    }
    
    try {
      this.body =  request.body.json();
    } catch (exception) {
      this.error = {
        errorMessage: `No valid JSON request for ${name}`,
      }
      this.success = false;
      return;
      }
    this.headers = request.headers;
    if (this.headers) {
      console.log(`${name} headers: `, this.headers);
    }
    this.success = true;
    }

    /**
     * Checks if the API is authenticated.
     * @returns {boolean} Returns true if the API is authenticated, otherwise false.
     */
    public isAuthenticated(): [ccfapp.AuthnIdentityCommon, ServiceResult<string>] {
      const [policy, isValidIdentity] = new AuthenticationService().isAuthenticated(this.request);
      console.log(`${this.name} Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`);
      return [policy, isValidIdentity];
    }
  }

