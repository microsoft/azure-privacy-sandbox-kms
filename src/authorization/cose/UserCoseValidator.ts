// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IValidatorService } from "../IValidationService";
import { ServiceResult } from "../../utils/ServiceResult";
import { LogContext } from "../../utils/Logger";
import { createHash } from "crypto";

export class UserCoseValidator implements IValidatorService {
  private logContext: LogContext;

  constructor(logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("UserCoseValidator");
  }

  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    if (request.caller === null || request.caller === undefined) {
      return ServiceResult.Failed({
        errorMessage: "No caller provided for COSE signature",
      }, 401, this.logContext );
    }

    const caller = request.caller;
    if (caller.policy !== "user_cose_sign1") {
      return ServiceResult.Failed({
        errorMessage: "Policy is not user_cose_sign1",
      }, 401, this.logContext );
    }

    const c: ccfapp.UserCOSESign1AuthnIdentity = caller;
    if (
      request.body.arrayBuffer().byteLength > 0 &&
      c.cose.content.byteLength == 0
    ) {
      return ServiceResult.Failed({
        errorMessage: "No cose content to validate",
      }, 401, this.logContext );
    }

    const isValid = this.isUser(c.id);
    if (isValid.failure) {
      return ServiceResult.Failed({
        errorMessage: `Error: invalid caller identity (UserCoseValidator)->${JSON.stringify(isValid)}`,
        errorType: "AuthenticationError",
      }, 401, this.logContext );
    }

    return ServiceResult.Succeeded(c.id, this.logContext);
  }

  /**
   * Checks if a user exists
   * @see https://microsoft.github.io/CCF/main/audit/builtin_maps.html#users-info
   * @param {string} userId userId to check if it exists
   * @returns {ServiceResult<boolean>}
   */
  public isUser(userId: string): ServiceResult<boolean> {
    const usersCerts = ccfapp.typedKv(
      "public:ccf.gov.users.certs",
      ccfapp.arrayBuffer,
      ccfapp.arrayBuffer,
    );
    const result = usersCerts.has(ccf.strToBuf(userId));
    return ServiceResult.Succeeded(result, this.logContext);
  }
}
