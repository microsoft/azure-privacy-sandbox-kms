// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IKeyReleasePolicyProps } from "..";

export interface IKeyReleasePolicy {
  type: string;
  claims: IKeyReleasePolicyProps;
}
