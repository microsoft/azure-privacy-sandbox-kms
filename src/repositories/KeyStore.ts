import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyItem, IWrapKey } from "../endpoints/IKeyItem";

export class KeyStore {
  private _store;

  // Create an instance of the class KeyStore
  constructor(public nameOfMap: string) {
    this._store = ccfapp.typedKv(
      nameOfMap,
      ccfapp.string,
      ccfapp.json<IKeyItem | IWrapKey>(),
    );
  }

  // Get the store
  public get store(): ccfapp.TypedKvMap<string, IKeyItem | IWrapKey> {
    return this._store;
  }

  // Store key item with claims digest in the map
  public storeItem(id: string, item: IKeyItem | IWrapKey, claims: string) {
    // Add claim digest using public key
    const claims_digest = ccf.crypto.digest("SHA-256", ccf.strToBuf(claims));
    ccf.rpc.setClaimsDigest(claims_digest);

    this.store.set(id, item);
  }

  public receipt(id: string) {
    const calcVersion = (id: string) => {
      const buf = new Uint8Array(ccf.strToBuf(id));
      const len = 8;
      let identifier = 0;
      for (let inx = 0; inx < len; inx++) {
        identifier >>= 8;
        identifier += buf[inx];
      }

      console.log(`Calculated version: ${identifier}`);
      return identifier;
    };

    const version = this.store.getVersionOfPreviousWrite(id);

    console.log(`version for id ${id}: ${JSON.stringify(version)}`);
    const states = ccf.historical.getStateRange(
      calcVersion(id),
      version,
      version,
      1800,
    );
    if (states !== null) {
      const ret = JSON.stringify(states[0].receipt);
      console.log(`Receipt: ${ret}`);
      return ret;
    }
    return undefined;
  }

  // Get the transaction version of the item with key id
  public getVersionOfPreviousWrite(id: string) {
    return this.store.getVersionOfPreviousWrite(id);
  }
}
