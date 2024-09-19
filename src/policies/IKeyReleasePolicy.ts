// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IKeyReleasePolicySnpProps } from "..";

export interface IKeyReleasePolicy {
  type: string;
  operators?: {
    gt?: IKeyReleasePolicySnpProps;
    gte?: IKeyReleasePolicySnpProps;
  }
  claims: IKeyReleasePolicySnpProps;
}
