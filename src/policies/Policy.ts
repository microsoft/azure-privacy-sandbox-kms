// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IPolicy } from "./IPolicy";
import { KeyReleasePolicy } from "./KeyReleasePolicy";

export class Policy<T extends IPolicy> {
  private policy: T;
  constructor(public name: string) {
    if (name === "key_release_policy") {
      this.policy = <T>(<any>new KeyReleasePolicy());
    }
  }

  public latestItem(): T {
    return this.policy;
  }
}
