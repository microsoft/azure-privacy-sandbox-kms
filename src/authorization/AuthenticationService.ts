// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IAuthenticationService } from "./IAuthenticationService";
import { JwtValidator } from "./jwt/JwtValidator";
import { IValidatorService } from "./IValidationService";
import { UserCertValidator } from "./certs/UserCertValidator";
import { MemberCertValidator } from "./certs/MemberCertValidator";
import { ccf } from "@microsoft/ccf-app/global";
import { Logger } from "../utils/Logger";

/**
 * CCF authentication policies
 */
export enum CcfAuthenticationPolicyEnum {
  User_cert = "user_cert",
  User_signature = "user_signature",
  Member_cert = "member_cert",
  Member_signature = "member_signature",
  Jwt = "jwt",
}

/**
 * Authentication Service Implementation
 */
export class AuthenticationService implements IAuthenticationService {
  private readonly validators = new Map<
    CcfAuthenticationPolicyEnum,
    IValidatorService
  >();

  constructor() {
    this.validators.set(CcfAuthenticationPolicyEnum.Jwt, new JwtValidator());
    this.validators.set(
      CcfAuthenticationPolicyEnum.User_cert,
      new UserCertValidator(),
    );
    this.validators.set(
      CcfAuthenticationPolicyEnum.Member_cert,
      new MemberCertValidator(),
    );
  }

  /*
   * Check if caller is a valid identity (user or member or access token)
   */
  public isAuthenticated(
    request: ccfapp.Request<any>,
  ): [ccfapp.AuthnIdentityCommon, ServiceResult<string>] {
    let caller: ccfapp.AuthnIdentityCommon;
    try {
      const caller = request.caller as unknown as ccfapp.AuthnIdentityCommon;
      if (!caller) {
        // no caller policy
        return [caller, ServiceResult.Succeeded("")];
      }
      Logger.debug(
        `Authorization: isAuthenticated result (AuthenticationService)-> ${caller.policy},${JSON.stringify(caller)}`,
      );
      const validator = this.validators.get(
        <CcfAuthenticationPolicyEnum>caller.policy,
      );
      return [caller, validator.validate(request)];
    } catch (ex) {
      return [
        caller,
        ServiceResult.Failed({
          errorMessage: `Error: invalid caller identity (AuthenticationService)-> ${ex}`,
          errorType: "AuthenticationError",
        }),
      ];
    }
  }
}
