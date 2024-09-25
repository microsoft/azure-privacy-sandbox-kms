// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IKeyReleasePolicySnpProps } from "..";

export interface IKeyReleasePolicy {
  type: string;
  gt?: IKeyReleasePolicySnpProps;
  gte?: IKeyReleasePolicySnpProps;
  claims: IKeyReleasePolicySnpProps;
}
