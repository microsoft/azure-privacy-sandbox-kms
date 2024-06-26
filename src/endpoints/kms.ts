// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import {
  CryptoKeyPair,
  SnpAttestationResult,
  ccf,
  snp_attestation,
} from "@microsoft/ccf-app/global";
import { IKeyItem } from "./IKeyItem";
import { IKeyReleasePolicyProps } from "../policies/IKeyReleasePolicyProps";
import { KeyGeneration } from "./KeyGeneration";
import { ITinkPublicKeySet, TinkKey, TinkPublicKey } from "./TinkKey";
import { AuthenticationService } from "../authorization/AuthenticationService";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";
import { ServiceResult } from "../utils/ServiceResult";
import {
  getKeyReleasePolicy,
  isPemPublicKey,
  queryParams,
  setKeyHeaders,
} from "../utils/Tooling";
import { KeyStore } from "../repositories/KeyStore";
import { LastestItemStore } from "../repositories/LastestItemStore";
import { hpkeKeyIdMap, hpkeKeysMap, keyReleasePolicyMap } from "../repositories/Maps";

export interface IAttestationValidationResult {
  result: boolean;
  errorMessage?: string;
  statusCode: number;
  attestationClaims?: IAttestationReport;
}

// Set CCF state for date and time
try {
  ccf.enableUntrustedDateTime(true);
} catch {
  // Will fail for unit tests. Do nothing
}

//#region KMS helpers

//#endregion

//#region KMS Policies
/**
 * Retrieves the key release policy.
 * @returns A ServiceResult containing the key release policy properties.
 */
export const key_release_policy = (): ServiceResult<IKeyReleasePolicyProps> => {
  const result = getKeyReleasePolicy(keyReleasePolicyMap);
  return ServiceResult.Succeeded<IKeyReleasePolicyProps>(result);
};
//#endregion

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

// Generate new key pair and store it on the store
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

// Hearthbeat endpoint currently used ro test authorization
export const hearthbeat = (
  request: ccfapp.Request<void>,
): ServiceResult<string | ccfapp.AuthnIdentityCommon> => {
  // check if caller has a valid identity
  const [policy, isValidIdentity] = new AuthenticationService().isAuthenticated(
    request,
  );
  console.log(
    `Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`,
  );
  if (isValidIdentity.failure) return isValidIdentity;
  return ServiceResult.Succeeded<ccfapp.AuthnIdentityCommon>(policy);
};

//#endregion

