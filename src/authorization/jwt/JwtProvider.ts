// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { DemoJwtProvider } from "./DemoJwtProvider";


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
    //this.identityProviders.set(JwtIdentityProviderEnum.MS_AAD, msJwtProvider);
    this.identityProviders.set(JwtIdentityProviderEnum.Demo, new DemoJwtProvider());
  }

  validate(request: ccfapp.Request<any>): ServiceResult<identityId> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    console.log(`Authorization: JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`)
    const provider = this.identityProviders.get(
      <JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer,
    );
    console.log(`Authorization: JWT provider (JwtValidator)-> ${provider}`)
    return provider.isValidJwtToken(jwtCaller);
  }
}
