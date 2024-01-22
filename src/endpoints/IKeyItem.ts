// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CryptoKeyPair,
  JsonWebKeyEdDSAPrivate,
} from "@microsoft/ccf-app/global";

// Define the interface for storing keys
export interface IKeyItem extends JsonWebKeyEdDSAPrivate {
  timestamp?: number;
  receipt?: string;
  id?: number;
}

// Define an interface for a wrap key
export interface IWrapKey extends CryptoKeyPair {
  kid?: string;
}
