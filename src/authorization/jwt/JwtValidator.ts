// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { JwtIdentityProviderEnum } from "./JwtIdentityProviderEnum";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";
import { DemoJwtProvider } from "./DemoJwtProvider";
import { MsJwtProvider } from "./MsJwtProvider";

export class JwtValidator implements IValidatorService {
  private readonly identityProviders = new Map<
    JwtIdentityProviderEnum,
    IJwtIdentityProvider
  >();

  constructor() {
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA,
      new MsJwtProvider("JwtMaaProvider"),
    );
    console.log("JwtValidator: JwtIdentityProviderEnum.MAA", JwtIdentityProviderEnum.MAA);
    this.identityProviders.set(
      JwtIdentityProviderEnum.MS_AAD,
      new MsJwtProvider("JwtProvider"),
    );
    console.log("JwtValidator: JwtIdentityProviderEnum.MS_AAD", JwtIdentityProviderEnum.MS_AAD);
    this.identityProviders.set(
      JwtIdentityProviderEnum.Demo,
      new DemoJwtProvider("DemoJwtProvider"),
    );
    console.log("JwtValidator: JwtIdentityProviderEnum.Demo", JwtIdentityProviderEnum.Demo);
  }

  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    console.log(
      `Authorization: JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`,
    );
    const provider = this.identityProviders.get(
      <JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer,
    );

    if (!provider) {
      const error = `Authorization: JWT validation provider is undefined (JwtValidator) for ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`;
      console.error(error);
      return ServiceResult.Failed(
        { errorMessage: error, errorType: "caller error" },
        400,
      );
    }
    const isValidJwtToken = provider.isValidJwtToken(jwtCaller);
    console.log(
      `Authorization: JWT validation result (JwtValidator) for provider ${provider.name}-> ${JSON.stringify(isValidJwtToken)}`,
    );
    return isValidJwtToken;
  }
}
