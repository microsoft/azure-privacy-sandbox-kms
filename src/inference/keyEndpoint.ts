// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
//import { ccf } from "@microsoft/ccf-app/global";
//import { Base64 } from "js-base64";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { IKeyItem } from "./IKeyItem";
import { hpkeKeyMap } from "./repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Logger, LogContext } from "../utils/Logger";
import { IMaaAttestationReport } from "../attestation/IMaaAttestationReport";
import { MaaAttestationValidation } from "../attestation/MaaAttestationValidation";
import { MaaWrappedKey, MaaWrapping } from "../wrapping/MaaWrapping";

// Enable the endpoint
enableEndpoint();

//#region Key endpoints interface
export interface IKeyRequest {
  kid?: number;
}

export interface IKeyResponse {
  kid: number;
  key: string;
  receipt: string;
}

//#endregion

//#region KMS Key endpoints
// Get latest private key
export const key = (
  request: ccfapp.Request<IKeyRequest>,
): ServiceResult<string | IKeyResponse> => {
  const logContext = new LogContext().appendScope("key");
  const serviceRequest = new ServiceRequest<IKeyRequest>(logContext, request);

  // check if caller has a valid identity
  let [policy, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  // Check for encrypted key
  let encrypted = false;

  if (serviceRequest.query) {
    encrypted = serviceRequest.query["encrypted"] === "true";
  }

  /**********************************************
  Logger.info(`headers: `, serviceRequest.headers);
  let authorization = serviceRequest.headers?.["authorization"];
  if (authorization === undefined) {
    return ServiceResult.Failed<string>(
      { errorMessage: `${name}: No authorization header` },
      400,
    );
  }

  // strip Bearer
  if (authorization) {
    authorization = authorization.replace("Bearer ", "");
  }
  // base64 decode
  let jwt: any = Base64.toUint8Array(authorization);
  jwt = ccf.bufToStr(jwt.buffer);
  Logger.info(`Authorization string: `, jwt);
  let start = jwt.indexOf('{"exp":');
  let end = jwt.indexOf('"x-ms-ver":"1.0"}') + 'x-ms-ver":"1.0"}'.length + 1;
  Logger.info(`Authorization string: start: ${start}, end: ${end}`, jwt);
  jwt = jwt.substring(start, end);
  Logger.info(`JWT string: `, jwt);
  
  const payload = JSON.parse(jwt);
  Logger.info(`Payload: `, payload);
  policy = {
    policy: "jwt",
    jwt: { 
      payload
    }
  } as unknown as ccfapp.JwtAuthnIdentity;
  **********************************************/

  Logger.info(`Policy: `, logContext, policy);

  // check MAA attestation
  let validateAttestationResult: ServiceResult<string | IMaaAttestationReport>;
  try {
    validateAttestationResult = new MaaAttestationValidation(
      policy! as ccfapp.JwtAuthnIdentity,
    ).validateAttestation();
    if (!validateAttestationResult.success) {
      return ServiceResult.Failed<string>(
        validateAttestationResult.error!,
        validateAttestationResult.statusCode,
        logContext,
      );
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `Error in validating attestation (${JSON.stringify(policy)}): ${exception.message}`,
      },
      500,
      logContext,
    );
  }

  // Check kid
  let kidString = serviceRequest.query?.["kid"];
  let kid: number | undefined;
  let keyItem: IKeyItem | undefined;
  if (kidString === undefined) {
    [kid, keyItem] = hpkeKeyMap.latestItem();
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: `No keys in store` },
        400,
        logContext,
      );
    }
  } else {
    kid = parseInt(kidString, 10);
    keyItem = hpkeKeyMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: `kid ${kid} not found in store` },
        404,
        logContext
      );
    }
  }

  const receipt = hpkeKeyMap.receipt(kid);
  Logger.info(`Retrieved key id: ${kid}`, logContext, keyItem);

  // Get receipt if available
  if (receipt !== undefined) {
    keyItem!.receipt = receipt;
    Logger.info(`Succesfully get key receipt for key id: ${kid}`, logContext);
    Logger.debug(`Key->Receipt: ${receipt}`, logContext);
  } else {
    return ServiceResult.Accepted(logContext);
  }

  // wrap the private key
  let wrappedKey: MaaWrappedKey;
  try {
    wrappedKey = new MaaWrapping(
      keyItem!,
      MaaWrapping.getWrappingKey(policy! as ccfapp.JwtAuthnIdentity),
    ).wrapKey(encrypted);
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `Error in wrapping key (${JSON.stringify(policy)}): ${exception.message}`,
      },
      500,
      logContext
    );
  }

  return ServiceResult.Succeeded({
    kid: kid,
    key: wrappedKey.wrappedKey,
    receipt: receipt,
  }, undefined, logContext);
};

//#endregion
