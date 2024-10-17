// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { hpkeKeyMap } from "./repositories/Maps";
import { enableEndpoint } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { Logger } from "../utils/Logger";
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
  const name = "listpubkeys";
  const serviceRequest = new ServiceRequest<void>(name, request);
  Logger.info(`${name}: Request received`);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    // Get last key
    const [_, keyItem] = hpkeKeyMap.latestItem();
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `${name}: No keys in store`,
        },
        400,
      );
    }

    // Get receipt if available
    const kid = keyItem.id!;
    const receipt = hpkeKeyMap.receipt(kid);
    Logger.info(`${name}: Retrieved key id: ${kid}`, keyItem);

    if (receipt !== undefined) {
      keyItem.receipt = receipt;
      Logger.info(`${name}: Succesfully get key receipt for key id: ${kid}`);
      Logger.debug(`${name}: pubkey->Receipt: ${receipt}`);
    } else {
      Logger.warn(`${name}: Failed to get key receipt for key id: ${kid}, Retry later`);
      return ServiceResult.Accepted();
    }

    delete keyItem.d;
    Logger.info(`${name}: Generate public key for key id: ${kid}`);
    const publicKey: string = new OhttpPublicKey(keyItem).get();

    const headers: { [key: string]: string } = {
      "content-type": "application/json",
    };
    const payload: IPublicKey[] = [
      {
        publicKey,
        receipt,
      },
    ];

    return ServiceResult.Succeeded<IPublicKey[]>(payload, headers);
  } catch (exception: any) {
    const errorMessage = `${name}: Error: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500);
  }
};
