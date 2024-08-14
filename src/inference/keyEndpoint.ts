// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { enableEndpoint } from "../utils/Tooling";
import { IKeyItem } from "./IKeyItem";
import { hpkeKeyMap } from "./repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Logger } from "../utils/Logger";

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
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

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

  return ServiceResult.Succeeded({
    kid: kid,
    key: JSON.stringify(keyItem),
    receipt: receipt
  });
};

//#endregion
