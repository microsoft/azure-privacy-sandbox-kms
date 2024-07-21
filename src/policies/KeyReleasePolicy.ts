// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IKeyReleasePolicy } from "./IKeyReleasePolicy";

export class KeyReleasePolicy implements IKeyReleasePolicy {
  public type = "add";
  public claims = {
    "x-ms-attestation-type": ["snp"],
  };
}