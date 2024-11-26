// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IKeyItem } from "./IKeyItem";
import { hpkeKeyIdMap, hpkeKeysMap } from "../repositories/Maps";
import { KeyGeneration } from "./KeyGeneration";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { LogContext, Logger } from "../utils/Logger";

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
  const logContext = new LogContext().appendScope(name);

  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    // Get HPKE key pair id
    const id = hpkeKeyIdMap.size + 1;

    // since OHTTP is limited to 2 char ids, we can only have ids from 10 to 99
    // So the current logic is to have ids rotate from 10 to 99
    const keyItem = KeyGeneration.generateKeyItem(id % 90 + 10);

    // Store HPKE key pair kid
    keyItem.kid = `${keyItem.kid!}_${id}`;
    hpkeKeyIdMap.storeItem(id, keyItem.kid);

    // Store HPKE key pair
    hpkeKeysMap.storeItem(keyItem.kid, keyItem, keyItem.x);
    Logger.secret(`Key item with id ${id} and kid ${keyItem.kid} stored`);

    delete keyItem.d;
    const ret = keyItem;
    return ServiceResult.Succeeded<IKeyItem>(ret, logContext);
  } catch (exception: any) {
    const errorMessage = `${name}: Error: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500, logContext);
  }
};
