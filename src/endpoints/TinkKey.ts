// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Base64 } from "js-base64";
import { IKeyItem } from "./IKeyItem";

export enum TinkKeyStatus {
  enabled = "ENABLED",
}
export enum TinkKeyPrefixType {
  raw = "RAW",
}
export enum TinkKeyMaterialType {
  asymmetricPublic = "ASYMMETRIC_PUBLIC",
}

/*
    Example of tink key
    "{\"primaryKeyId\":1135265501,\"key\":[{\"keyData\":{\"typeUrl\":"
      + "\"type.googleapis.com/google.crypto.tink.HpkePublicKey\",\"value\":\""
      + "EgYIARABGAMaIOA9jsWlFpxJ46AKzJthzK/lb7XpbmH8uFLxNwneII4K"
      + "\",\"keyMaterialType\":"
      + "\"ASYMMETRIC_PUBLIC\"},\"status\":\"ENABLED\",\"keyId\":1135265501,"
      + "\"outputPrefixType\":\"RAW\"}]}";
*/
export interface ITinkKey {
  keyData: {
    typeUrl: string;
    value: string;
    keyMaterialType: string;
  };
  status: TinkKeyStatus;
  keyId: number;
  outputPrefixType: TinkKeyPrefixType;
}
export interface ITinkPublicKey {
  id: string;
  key: string;
}

export interface ITinkKeySet {
  primaryKeyId: number;
  key: ITinkKey[];
}

export interface ITinkPublicKeySet {
  keys: ITinkPublicKey[];
}

export class TinkPublicKey {
  constructor(public keyItem: IKeyItem[]) {}

  private _tinkKeySet: undefined | ITinkPublicKeySet;

  private transformKey = (inx: number): string => {
    const keyBuffer = Base64.toUint8Array(this.keyItem[inx].x);
    return Base64.fromUint8Array(keyBuffer);
  };

  // Get a key set in tink format
  public get = (): ITinkPublicKeySet => {
    if (this._tinkKeySet !== undefined) {
      return this._tinkKeySet;
    }

    const tinkKeySet: ITinkPublicKeySet = {
      keys: [],
    };
    for (let inx = 0; inx < this.keyItem.length; inx++) {
      const key: ITinkPublicKey = {
        key: this.transformKey(inx),
        id: `${this.keyItem[inx].id}`,
      };
      tinkKeySet.keys.push(key);
    }
    this._tinkKeySet = tinkKeySet;
    return tinkKeySet;
  };

  // Serialized key set in tink format
  public serialized = () => {
    this._tinkKeySet = this._tinkKeySet || this.get();
    return JSON.stringify(this._tinkKeySet);
  };
}

export class TinkKey {
  constructor(public keyItem: IKeyItem[]) {}

  private _tinkKeySet: undefined | ITinkKeySet;

  private transformKey = (inx: number): string => {
    const keyBuffer = Base64.toUint8Array(this.keyItem[inx].x);
    return Base64.fromUint8Array(keyBuffer);
  };

  // Get a key set in tink format
  public get = (): ITinkKeySet => {
    if (this._tinkKeySet !== undefined) {
      return this._tinkKeySet;
    }

    // Get id of key
    const primaryKeyId = this.keyItem[0].id;

    const tinkKeySet: ITinkKeySet = {
      primaryKeyId,
      key: [],
    };
    for (let inx = 0; inx < this.keyItem.length; inx++) {
      const key: ITinkKey = {
        keyData: {
          typeUrl: "https://schema.org/PublicKey/Azure/HpkePublicKey",
          value: this.transformKey(inx),
          keyMaterialType: TinkKeyMaterialType.asymmetricPublic,
        },
        status: TinkKeyStatus.enabled,
        keyId: primaryKeyId,
        outputPrefixType: TinkKeyPrefixType.raw,
      };
      tinkKeySet.key.push(key);
    }
    this._tinkKeySet = tinkKeySet;
    return tinkKeySet;
  };

  // Serialized key set in tink format
  public serialized = () => {
    this._tinkKeySet = this._tinkKeySet || this.get();
    return JSON.stringify(this._tinkKeySet);
  };
}
/*
export class TinkKeyProto {
  constructor(public keyItem: IKeyItem[]) {}
 // Get a key set in tink format
 public get = (): Uint8Array => {
  const encryptionKey = new kmsproto.EncryptionKey();
  encryptionKey.setKeyId(randomUUID());
  encryptionKey.setCreationTime(Date.now());
  encryptionKey.setJsonEncodedKeyset(JSON.stringify(new TinkKey(this.keyItem).get()));
  const proto = encryptionKey.serializeBinary();
  console.log(`Private key proto: `, Base64.fromUint8Array(proto));
  return proto;
 }
}
*/
