// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IKeyItem } from "./IKeyItem";
import { hpkeKeyMap } from "./repositories/Maps";
import { KeyGeneration } from "./KeyGeneration";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Logger } from "../utils/Logger";

// Enable the endpoint
enableEndpoint();

/**
 * Refreshes the HPKE key pair and stores it in the key maps.
 *
 * @param request - The request object.
 * @returns A `ServiceResult` containing the refreshed key pair or an error message.
 */
export const refresh = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IKeyItem> => {
  const name = "refresh";
  const serviceRequest = new ServiceRequest<void>(name, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    // Get HPKE key pair id
    const id = (hpkeKeyMap.size + 1) % 256;

    // Generate HPKE key pair with the id
    const keyItem = KeyGeneration.generateKeyItem(id);
    Logger.info(`Key generated with id ${id}`, keyItem);

    // Store HPKE key pair using kid
    keyItem.kid = `${keyItem.kid!}`;
    hpkeKeyMap.storeItem(id, keyItem, keyItem.x + keyItem.y);
    Logger.info(`Key item with id ${id} and kid ${keyItem.kid} stored`);

    delete keyItem.d;
    return ServiceResult.Succeeded<IKeyItem>(keyItem);
  } catch (exception: any) {
    const errorMessage = `${name}: Error: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500);
  }
};
