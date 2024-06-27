// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf } from "@microsoft/ccf-app/global";
import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IKeyItem } from "./IKeyItem";
import { hpkeKeyIdMap, hpkeKeysMap } from "../repositories/Maps";
import { KeyGeneration } from "./KeyGeneration";

// Set CCF state for date and time
try {
    ccf.enableUntrustedDateTime(true);
  } catch {
    // Will fail for unit tests. Do nothing
  }
  
/**
 * Refreshes the HPKE key pair and stores it in the key maps.
 * 
 * @param request - The request object.
 * @returns A `ServiceResult` containing the refreshed key pair or an error message.
 */
export const refresh = (
    request: ccfapp.Request<void>,
  ): ServiceResult<string | IKeyItem> => {
    try {
      // Get HPKE key pair id
      const id = hpkeKeyIdMap.size + 1;
  
      // Generate HPKE key pair with a six digit id
      const keyItem = KeyGeneration.generateKeyItem(100000 + id);
  
      // Store HPKE key pair kid
      keyItem.kid = `${keyItem.kid!}_${id}`;
      hpkeKeyIdMap.storeItem(id, keyItem.kid);
  
      // Store HPKE key pair
      hpkeKeysMap.storeItem(keyItem.kid, keyItem, keyItem.x);
      console.log(`Key item with id ${id} and kid ${keyItem.kid} stored`);
  
      delete keyItem.d;
      const ret = keyItem;
      console.log(`refresh returns: ${JSON.stringify(ret)}`);
      return ServiceResult.Succeeded<IKeyItem>(ret);
    } catch (exception: any) {
      const errorMessage = `Error refresh: ${exception.message}`;
      console.error(errorMessage);
      return ServiceResult.Failed<string>({ errorMessage }, 500);
    }
  };
  