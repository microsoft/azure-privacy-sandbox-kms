// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ISnpAttestation {
  evidence: string;
  endorsements: string;
  uvm_endorsements: string;
  endorsed_tcb: string;
}
