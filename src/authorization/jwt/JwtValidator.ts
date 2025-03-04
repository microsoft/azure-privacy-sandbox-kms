// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../../utils/ServiceResult";
import { IValidatorService } from "../IValidationService";
import { JwtIdentityProviderEnum } from "./JwtIdentityProviderEnum";
import { IJwtIdentityProvider } from "./IJwtIdentityProvider";
import { DemoJwtProvider } from "./DemoJwtProvider";
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
      JwtIdentityProviderEnum.MS_AAD,
      new MsJwtProvider("JwtProvider", this.logContext),
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.MS_AAD_V2,
      new MsJwtProvider("JwtProvider", this.logContext),
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.TENANT_MS_AAD_V2,
      new MsJwtProvider("JwtProvider", this.logContext),
    );
    this.identityProviders.set(
      JwtIdentityProviderEnum.Demo,
      new DemoJwtProvider("DemoJwtProvider"),
    );
  }

  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    const jwtCaller = request.caller as unknown as ccfapp.JwtAuthnIdentity;
    Logger.debug(
      `Authorization: JWT jwtCaller (JwtValidator)-> ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`,
      this.logContext
    );
    const provider = this.identityProviders.get(
      <JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer,
    );

    if (!provider) {
      const error = `Authorization: JWT validation provider is undefined (JwtValidator) for ${<JwtIdentityProviderEnum>jwtCaller.jwt.keyIssuer}`;
      Logger.error(error, this.logContext);
      return ServiceResult.Failed(
        { errorMessage: error, errorType: "caller error" },
        400,
        this.logContext
      );
    }
    const isValidJwtToken = provider.isValidJwtToken(jwtCaller);
    Logger.debug(
      `Authorization: JWT validation result (JwtValidator) for provider ${provider.name}-> ${JSON.stringify(isValidJwtToken)}`,
      this.logContext
    );
    return isValidJwtToken;
  }
}
