// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { ITinkPublicKeySet, TinkKey, TinkPublicKey } from "./TinkKey";
import { hpkeKeyIdMap, hpkeKeysMap } from "../repositories/Maps";
import { IKeyItem } from "./IKeyItem";
import { queryParams, setKeyHeaders } from "../utils/Tooling";

// Get list of public keys
export const listpubkeys = (): ServiceResult<string | ITinkPublicKeySet> => {
  try {
    // Get last key
    const [id, kid] = hpkeKeyIdMap.latestItem();
    if (kid === undefined) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `No keys in store`,
        },
        400,
      );
    }
    const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `kid ${kid} not found in store`,
        },
        404,
      );
    }

    delete keyItem.d;
    const publicKey: any = new TinkPublicKey([keyItem]).get();

    const headers = setKeyHeaders();
    return ServiceResult.Succeeded<ITinkPublicKeySet>(publicKey, headers);
  } catch (exception: any) {
    const errorMessage = `Error listpubkeys: ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500);
  }
};

// Get latest public key
export const pubkey = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IKeyItem> => {
  let id: number, keyItem: IKeyItem;
  try {
    const query = queryParams(request);
    let kid: string;
    let id: number;
    if (query && query["kid"]) {
      kid = query["kid"];
    } else {
      [id, kid] = hpkeKeyIdMap.latestItem();
      if (kid === undefined) {
        return ServiceResult.Failed(
          {
            errorMessage: `No keys in store`,
          },
          400,
        );
      }
    }

    let fmt = "jwk";
    if (query && query["fmt"]) {
      fmt = query["fmt"];
      if (!(fmt === "jwk" || fmt === "tink")) {
        return ServiceResult.Failed(
          {
            errorMessage: `Wrong fmt query parameter '${kid}'. Must be jwt or tink.`,
          },
          400,
        );
      }
    }

    console.log(`Get key with kid ${kid}`);
    const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return ServiceResult.Failed(
        {
          errorMessage: `kid ${kid} not found in store`,
        },
        404,
      );
    }

    // Get receipt if available
    const receipt = hpkeKeysMap.receipt(kid);
    if (receipt !== undefined) {
      keyItem.receipt = receipt;
      console.log(`pubkey->Receipt: ${receipt}`);
    } else {
      return ServiceResult.Accepted();
    }

    delete keyItem.d;
    if (fmt === "tink") {
      const headers = setKeyHeaders();
      console.log(`response headers: `, headers, keyItem);
      const tinkKey = new TinkKey([keyItem]);
      console.log(`tinkKey: `, tinkKey);
      const publicKey: any = tinkKey.get();
      if (receipt !== undefined) {
        publicKey.receipt = receipt;
      }
      const ret = publicKey;
      console.log(`pubkey returns (${id}) in tink:`, ret);
      return ServiceResult.Succeeded<string>(ret, headers);
    }

    const ret = keyItem;
    console.log(`pubkey returns (${id}) in jwk: ${JSON.stringify(ret)}`);
    return ServiceResult.Succeeded<IKeyItem>(ret);
  } catch (exception: any) {
    const errorMessage = `Error pubkey (${id}): ${exception.message}`;
    console.error(errorMessage);
    return ServiceResult.Failed<string>({ errorMessage }, 500);
  }
};

const hex = (buf: ArrayBuffer) => {
  return Array.from(new Uint8Array(buf))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
};
