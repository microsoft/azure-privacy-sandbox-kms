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
  private logContext: LogContext;

  constructor(logContext?: LogContext) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("JwtValidator");
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_deus2,
      new MsJwtProvider("JwtMaaProvider", this.logContext),
    );
    Logger.debug(
      "JwtIdentityProviderEnum.MAA_deus2",
      JwtIdentityProviderEnum.MAA_deus2,
      this.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_NoSecureBootTyFu,
      new MsJwtProvider("JwtMaaProvider", this.logContext),
    );
    Logger.debug(
      "JwtIdentityProviderEnum.MAA_NoSecureBootTyFu",
      JwtIdentityProviderEnum.MAA_NoSecureBootTyFu,
      this.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_NoSecureBootWeu,
      new MsJwtProvider("JwtMaaProvider", this.logContext),
    );
    Logger.debug(
      "JwtIdentityProviderEnum.MAA_NoSecureBootWeu",
      JwtIdentityProviderEnum.MAA_NoSecureBootWeu,
      this.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MAA_NoSecureBootEus,
      new MsJwtProvider("JwtMaaProvider", this.logContext),
    );
    Logger.debug(
      "JwtIdentityProviderEnum.MAA_NoSecureBootEus",
      JwtIdentityProviderEnum.MAA_NoSecureBootEus,
      this.logContext
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MS_AAD,
      new MsJwtProvider("JwtProvider", this.logContext),
    );
    Logger.debug(
      "JwtIdentityProviderEnum.MS_AAD",
      JwtIdentityProviderEnum.MS_AAD,
      this.logContext
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
      `JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`,
      this.logContext
    );
    Logger.info(`JWT content: ${JSON.stringify(jwtCaller.jwt)}`, this.logContext);
    const provider = this.identityProviders.get(
      <JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer,
    );

    if (!provider) {
      const error = `JWT validation provider is undefined (JwtValidator) for ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`;
      Logger.error(error, this.logContext);
      return ServiceResult.Failed(
        { errorMessage: error, errorType: "caller error" },
        400,
        this.logContext
      );
    }
    const isValidJwtToken = provider.isValidJwtToken(jwtCaller);
    Logger.info(
      `JWT validation result (JwtValidator) for provider ${provider.name}-> ${JSON.stringify(isValidJwtToken)}`,
      this.logContext
    );
    return isValidJwtToken;
  }
}
