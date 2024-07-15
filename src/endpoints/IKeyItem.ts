// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CryptoKeyPair,
  JsonWebKeyEdDSAPublic,
} from "@microsoft/ccf-app/global";

// Define the interface for storing keys
export interface IKeyItem extends JsonWebKeyEdDSAPublic {
  timestamp?: number;
  receipt?: string;
  id?: number;
  d?: string;
}

// Define an interface for a wrap key
export interface IWrapKey extends CryptoKeyPair {
  kid?: string;
}
