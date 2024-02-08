// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
//import msJwtProvider from "./ms-aad-jwt-provider";
import { ServiceResult } from "../../utils/ServiceResult";
import { DemoJwtProvider } from "./DemoJwtProvider";
import { IValidatorService } from "../IValidationService";

/**
 * JWT Identity Providers
 */
export enum JwtIdentityProviderEnum {
  MS_AAD = "https://login.microsoftonline.com/common/v2.0",
  Demo = "http://Demo-jwt-issuer",
}
type identityId = string;

export interface IJwtIdentityProvider {
  isValidJwtToken(identity: ccfapp.JwtAuthnIdentity): ServiceResult<string>;
}

export class JwtValidator implements IValidatorService {
  private readonly identityProviders = new Map<
    JwtIdentityProviderEnum,
    IJwtIdentityProvider
  >();

  constructor() {
    //this.identityProviders.set(JwtIdentityProviderEnum.MS_AAD, new JwtProvider());
    this.identityProviders.set(JwtIdentityProviderEnum.Demo, new DemoJwtProvider());
  }

  validate(request: ccfapp.Request<any>): ServiceResult<identityId> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    console.log(`Authorization: JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`)
    const provider = this.identityProviders.get(
      <JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer,
    );

    if (!provider) {
      const error = `Authorization: JWT validation provider is undefined (JwtValidator) for ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`;
      console.log(error);
      return ServiceResult.Failed({errorMessage: error, errorType: "caller error"}, 400);  
    }
    const isValidJwtToken = provider.isValidJwtToken(jwtCaller);
    console.log(`Authorization: JWT validation result (JwtValidator)-> ${isValidJwtToken}`)
    return isValidJwtToken;
  }
}
