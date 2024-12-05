// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { ITinkPublicKeySet, TinkKey, TinkPublicKey } from "./TinkKey";
import { hpkeKeyIdMap, hpkeKeysMap } from "../repositories/Maps";
import { IKeyItem } from "./IKeyItem";
import { enableEndpoint, setKeyHeaders } from "../utils/Tooling";
import { ServiceRequest } from "../utils/ServiceRequest";
import { LogContext, Logger } from "../utils/Logger";

// Enable the endpoint
enableEndpoint();

// Get list of public keys
export const listpubkeys = (
  request: ccfapp.Request<void>,
): ServiceResult<string | ITinkPublicKeySet> => {
  const name = "listpubkeys";
  const logContext = new LogContext().appendScope(name);
  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  try {
    // Get last key
    const [_, kid] = hpkeKeyIdMap.latestItem();
    if (kid === undefined) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `${name}: No keys in store`,
        },
        400,
        logContext
      );
    }
    const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `${name}: kid ${kid} not found in store`,
        },
        404,
        logContext
      );
    }

    delete keyItem.d;
    const publicKey: any = new TinkPublicKey([keyItem]).get();

    const headers = setKeyHeaders();
    return ServiceResult.Succeeded<ITinkPublicKeySet>(publicKey, logContext, headers);
  } catch (exception: any) {
    const errorMessage = `${name}: Error: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500, logContext);
  }
};

// Get latest public key
export const pubkey = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IKeyItem> => {
  const name = "pubkey";
  const logContext = new LogContext().appendScope(name);
  const serviceRequest = new ServiceRequest<void>(logContext, request);

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  let id: number | undefined;
  try {
    let kid: string | undefined;
    if (serviceRequest.query && serviceRequest.query["kid"]) {
      kid = serviceRequest.query["kid"];
    } else {
      [id, kid] = hpkeKeyIdMap.latestItem();
      if (kid === undefined) {
        return ServiceResult.Failed(
          {
            errorMessage: `${name}: No keys in store`,
          },
          400,
          logContext
        );
      }
    }
    const fmt = serviceRequest.query?.["fmt"] || "jwk";
    if (!(fmt === "jwk" || fmt === "tink")) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `${name}: Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
        },
        400,
        logContext
      );
    }

    Logger.debug(`Get key with kid ${kid}`);
    const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return ServiceResult.Failed(
        {
          errorMessage: `kid ${kid} not found in store`,
        },
        404,
        logContext
      );
    }

    // Get receipt if available
    const receipt = hpkeKeysMap.receipt(kid);
    if (receipt !== undefined) {
      keyItem.receipt = receipt;
      Logger.debug(`pubkey->Receipt: ${receipt}`);
    } else {
      return ServiceResult.Accepted(logContext);
    }

    delete keyItem.d;
    if (fmt === "tink") {
      const headers = setKeyHeaders();
      Logger.debug(`response headers: `, headers, keyItem);
      const tinkKey = new TinkKey([keyItem]);
      Logger.debug(`tinkKey: `, tinkKey);
      const publicKey: any = tinkKey.get();
      if (receipt !== undefined) {
        publicKey.receipt = receipt;
      }
      return ServiceResult.Succeeded<string>(publicKey, logContext, headers);
    }

    return ServiceResult.Succeeded<IKeyItem>(keyItem, logContext);
  } catch (exception: any) {
    const errorMessage = `${name}: Error (${id}): ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500, logContext);
  }
};
