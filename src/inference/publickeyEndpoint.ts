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

// Get list of public keys
export const listpubkeys = (
  request: ccfapp.Request<void>,
): ServiceResult<string> => {
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

    delete keyItem.d;
    const publicKey: string = new OhttpPublicKey(keyItem).get();

    const headers: { [key: string]: string } = {
      "content-type": "application/ohttp-keys "
    };
  
    return ServiceResult.Succeeded<string>(publicKey, headers);
  } catch (exception: any) {
    const errorMessage = `${name}: Error: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500);
  }
};
