// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { hpkeKeyMap } from "./repositories/Maps";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Logger, LogContext } from "../utils/Logger";
import { OhttpPublicKey } from "./OhttpPublicKey";

// Enable the endpoint
enableEndpoint();

export interface IPublicKey {
  publicKey: string;
  receipt: string;
}

// Get list of public keys
export const listpubkeys = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IPublicKey[]> => {
  const logContext = new LogContext().appendScope("publickeyEndpoint");
  const serviceRequest = new ServiceRequest<void>(logContext, request);
  Logger.info(`Request received`, logContext);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    // Get last key
    const [_, keyItem] = hpkeKeyMap.latestItem();
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `${logContext.getBaseScope()}: No keys in store`,
        },
        400,
        logContext,
        serviceRequest.requestId,
      );
    }

    // Get receipt if available
    const kid = keyItem.id!;
    const receipt = hpkeKeyMap.receipt(kid);
    Logger.info(`Retrieved key id: ${kid}`, logContext, keyItem);

    if (receipt !== undefined) {
      keyItem.receipt = receipt;
      Logger.info(`Succesfully get key receipt for key id: ${kid}`, logContext);
      Logger.debug(`pubkey->Receipt: ${receipt}`, logContext);
    } else {
      Logger.warn(`Failed to get key receipt for key id: ${kid}, Retry later`, logContext);
      return ServiceResult.Accepted(logContext, serviceRequest.requestId);
    }

    delete keyItem.d;
    Logger.info(`Generate public key for key id: ${kid}`, logContext);
    const publicKey: string = new OhttpPublicKey(keyItem, logContext).get();

    const headers: { [key: string]: string } = {
      "content-type": "application/json",
    };
    const payload: IPublicKey[] = [
      {
        publicKey,
        receipt,
      },
    ];

    return ServiceResult.Succeeded<IPublicKey[]>(payload, headers, logContext, serviceRequest.requestId);
  } catch (exception: any) {
    const errorMessage = `${logContext.getBaseScope()}: Error: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500, logContext, serviceRequest.requestId);
  }
};
