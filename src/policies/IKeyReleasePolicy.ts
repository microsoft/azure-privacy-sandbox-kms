// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IKeyReleasePolicySnpProps } from "..";

export enum KeyReleasePolicyType {
  ADD = "add",
  REMOVE = "remove",
}

export interface IKeyReleasePolicy {
  type: KeyReleasePolicyType;
  gt?: IKeyReleasePolicySnpProps;
  gte?: IKeyReleasePolicySnpProps;
  claims: IKeyReleasePolicySnpProps;
}