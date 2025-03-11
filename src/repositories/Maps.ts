// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf } from "@microsoft/ccf-app/global";
import { LastestItemStore } from "./LastestItemStore";
import { KeyStore } from "./KeyStore";

//#region KMS Stores
// Stores
export const hpkeKeysMap = new KeyStore("HpkeKeys");
export const hpkeKeyIdMap = new LastestItemStore<number, string>("HpkeKeyids");
export const keyReleaseMapName = "public:policies.key_release";
export const keyReleasePolicyMap = ccf.kv[keyReleaseMapName];
export const settingsMapName = "public:policies.settings";
export const settingsPolicyMap = ccf.kv[settingsMapName];
export const keyRotationMapName = "public:policies.key_rotation";
export const keyRotationPolicyMap = ccf.kv[keyRotationMapName];
//#endregion
