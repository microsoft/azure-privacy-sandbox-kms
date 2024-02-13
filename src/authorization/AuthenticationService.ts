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
      CcfAuthenticationPolicyEnum.User_signature,
      new UserCertValidator(),
    );
    this.validators.set(
      CcfAuthenticationPolicyEnum.Member_cert,
      new MemberCertValidator(),
    );
    this.validators.set(
      CcfAuthenticationPolicyEnum.Member_signature,
      new MemberCertValidator(),
    );
  }

  /*
   * Check if caller is a valid identity (user or member or access token)
   */
  public isAuthenticated(
    request: ccfapp.Request<any>,
  ): ServiceResult<string> {
    try {
      const caller = request.caller as unknown as ccfapp.AuthnIdentityCommon;
      console.log(`Authorization: isAuthenticated result (AuthenticationService)-> ${caller.policy},${JSON.stringify(caller)}`)
      const validator = this.validators.get(
        <CcfAuthenticationPolicyEnum>caller.policy,
      );
      
      const issuersMap = ccf.kv["public:ccf.gov.jwt.issuers"];
      issuersMap.forEach((v, k) => {
        let issuer = ccf.bufToStr(k);
        let info = ccf.bufToJsonCompatible(v);
        console.log(`Issuer: ${issuer}: ${JSON.stringify(info)}`);
      });

      return validator.validate(request);
    } catch (ex) {
      return ServiceResult.Failed({
        errorMessage: `Error: invalid caller identity (AuthenticationService)-> ${ex}`,
        errorType: "AuthenticationError",
      });
    }
  }
}
