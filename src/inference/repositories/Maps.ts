// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LastestItemStore } from "../../repositories/LastestItemStore";
import { IKeyItem } from "../IKeyItem";

//#region KMS Stores
// Stores
export const hpkeKeyMapName = "hpkeKey";
export const hpkeKeyMap = new LastestItemStore<number, IKeyItem>(
  hpkeKeyMapName,
);
//#endregion
