// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { Logger } from "../utils/Logger";

export class LastestItemStore<K extends number, T> {
  private _store;

  // Create an instance of the class LastestItemStore
  constructor(public nameOfMap: string) {
    this._store = ccfapp.typedKv(nameOfMap, ccfapp.uint32, ccfapp.json<T>());
  }

  // Get the store
  public get store(): ccfapp.TypedKvMap<K, T> {
    return this._store;
  }

  // Get the size of the store
  public get size(): number {
    return this._store.size;
  }

  // Get the latest item in the store
  public latestItem(): [number, T | undefined] {
    const id = this._store.size;
    if (id <= 0) {
      return [id, undefined];
    }
    const item: T = this._store.get(id);
    return [id, item];
  }

  // Store key item with claims digest in the map
  public storeItem(id: K, item: T, claims?: string) {
    // Add claim digest using public key
    if (claims) {
      const claims_digest = ccf.crypto.digest("SHA-256", ccf.strToBuf(claims));
      ccf.rpc.setClaimsDigest(claims_digest);
    }

    this.store.set(id, item);
  }

  public receipt(id: K) {
    const version = this.store.getVersionOfPreviousWrite(id) || 0;
    Logger.debug(`version for id ${id}: ${JSON.stringify(version)}`);
    const states = ccf.historical.getStateRange(id, version, version, 1800);
    if (states !== null) {
      const ret = JSON.stringify(states[0].receipt);
      Logger.debug(`Receipt: ${ret}`);
      return ret;
    }
    return undefined;
  }

  // Get the transaction version of the item with key id
  public getVersionOfPreviousWrite(id: K) {
    return this.store.getVersionOfPreviousWrite(id);
  }
}
