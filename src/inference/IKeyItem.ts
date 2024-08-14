// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CryptoKeyPair,
  JsonWebKeyECPublic,
} from "@microsoft/ccf-app/global";
import { enableEndpoint } from "../utils/Tooling";

// Enable the endpoint
enableEndpoint();

// Define the interface for storing keys
export interface IKeyItem extends JsonWebKeyECPublic {
  timestamp?: number;
  receipt?: string;
  id?: number;
  d?: string;
}

// Define an interface for a wrap key
export interface IWrapKey extends CryptoKeyPair {
  kid?: string;
}
