// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf } from "@microsoft/ccf-app/global";
import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { IKeyItem } from "./IKeyItem";
import { hpkeKeyMap } from "./repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Logger } from "../utils/Logger";
import { IMaaAttestationReport } from "../attestation/IMaaAttestationReport";
import { MaaAttestationValidation } from "../attestation/MaaAttestationValidation";
import { MaaWrappedKey, MaaWrapping } from "../wrapping/MaaWrapping";
import { Base64 } from "js-base64";

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
  const name = "key";
  const serviceRequest = new ServiceRequest<IKeyRequest>(name, request);

  // check if caller has a valid identity
  let [policy, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  // Check for encrypted key
  let encrypted = false;
  if (serviceRequest.query) {
    encrypted = serviceRequest.query["encrypted"] === "true";
  }


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
  Logger.info(`Authorization: `, jwt);
  jwt = ccf.bufToStr(jwt.buffer);
  Logger.info(`Authorization string: `, jwt);
  let start = jwt.indexOf('{"exp":');
  let end = jwt.indexOf('"x-ms-ver":"1.0"}') + 'x-ms-ver":"1.0"}'.length + 1;
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
  
  Logger.info(`Policy: `, policy);

  // check MAA attestation  
  let validateAttestationResult: ServiceResult<string | IMaaAttestationReport>;
  try {
    validateAttestationResult = new MaaAttestationValidation(policy! as ccfapp.JwtAuthnIdentity).validateAttestation();
    if (!validateAttestationResult.success) {
      return ServiceResult.Failed<string>(
        validateAttestationResult.error!,
        validateAttestationResult.statusCode,
      );
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Error in validating attestation (${JSON.stringify(policy)}): ${exception.message}`,
      },
      500,
    );
  }

  // Check kid
  let kid = serviceRequest.body?.["kid"];
  let keyItem: IKeyItem | undefined;
  if (kid === undefined) {
    [kid, keyItem] = hpkeKeyMap.latestItem();
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: `${name}: No keys in store` },
        400,
      );
    }
  }

  const receipt = hpkeKeyMap.receipt(kid);

  // Get receipt if available
  if (receipt !== undefined) {
    keyItem!.receipt = receipt;
    Logger.debug(`Key->Receipt: ${receipt}`);
  } else {
    return ServiceResult.Accepted();
  }

  // wrap the private key
  let wrappedKey: MaaWrappedKey;
  try {
    wrappedKey = new MaaWrapping(keyItem!, MaaWrapping.getWrappingKey(policy! as ccfapp.JwtAuthnIdentity)).wrapKey(encrypted);
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Error in wrapping key (${JSON.stringify(policy)}): ${exception.message}`,
      },
      500,
    );
  } 
  
  return ServiceResult.Succeeded({
    kid: kid,
    key: wrappedKey.wrappedKey,
    receipt: receipt
  });
};

//#endregion
