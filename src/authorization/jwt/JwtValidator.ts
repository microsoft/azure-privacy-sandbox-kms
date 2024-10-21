// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { JwtIdentityProviderEnum } from "./JwtIdentityProviderEnum";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";
//import { DemoJwtProvider } from "./DemoJwtProvider";
import { MsJwtProvider } from "./MsJwtProvider";
import { Logger, LogContext } from "../../utils/Logger";

export class JwtValidator implements IValidatorService {
  private readonly identityProviders = new Map<
    JwtIdentityProviderEnum,
    IJwtIdentityProvider
  >();
  private static readonly logContext = new LogContext().appendScope("JwtValidator");

  constructor() {
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_deus2,
      new MsJwtProvider("JwtMaaProvider"),
    );
    Logger.debug(
      "JwtValidator: JwtIdentityProviderEnum.MAA_deus2",
      JwtIdentityProviderEnum.MAA_deus2,
      JwtValidator.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_NoSecureBootTyFu,
      new MsJwtProvider("JwtMaaProvider"),
    );
    Logger.debug(
      "JwtValidator: JwtIdentityProviderEnum.MAA_NoSecureBootTyFu",
      JwtIdentityProviderEnum.MAA_NoSecureBootTyFu,
      JwtValidator.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_NoSecureBootWeu,
      new MsJwtProvider("JwtMaaProvider"),
    );
    Logger.debug(
      "JwtValidator: JwtIdentityProviderEnum.MAA_NoSecureBootWeu",
      JwtIdentityProviderEnum.MAA_NoSecureBootWeu,
      JwtValidator.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_NoSecureBootEus,
      new MsJwtProvider("JwtMaaProvider"),
    );
    Logger.debug(
      "JwtValidator: JwtIdentityProviderEnum.MAA_NoSecureBootEus",
      JwtIdentityProviderEnum.MAA_NoSecureBootEus,
      JwtValidator.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MS_AAD,
      new MsJwtProvider("JwtProvider"),
    );
    Logger.debug(
      "JwtValidator: JwtIdentityProviderEnum.MS_AAD",
      JwtIdentityProviderEnum.MS_AAD,
      JwtValidator.logContext
    );
    /* Remove demo provider
    this.identityProviders.set(
      JwtIdentityProviderEnum.Demo,
      new DemoJwtProvider("DemoJwtProvider"),
    );
    console.log(
      "JwtValidator: JwtIdentityProviderEnum.Demo",
      JwtIdentityProviderEnum.Demo,
    );
    */
  }

  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    Logger.info(
      `Authorization: JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`,
      JwtValidator.logContext
    );
    const provider = this.identityProviders.get(
      <JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer,
    );

    if (!provider) {
      const error = `Authorization: JWT validation provider is undefined (JwtValidator) for ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`;
      Logger.error(error, JwtValidator.logContext);
      return ServiceResult.Failed(
        { errorMessage: error, errorType: "caller error" },
        400,
        JwtValidator.logContext
      );
    }
    const isValidJwtToken = provider.isValidJwtToken(jwtCaller);
    Logger.info(
      `Authorization: JWT validation result (JwtValidator) for provider ${provider.name}-> ${JSON.stringify(isValidJwtToken)}`,
      JwtValidator.logContext
    );
    return isValidJwtToken;
  }
}
