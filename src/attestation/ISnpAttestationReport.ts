// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IAttestationReport {
  "x-ms-attestation-type"?: string;
  "x-ms-compliance-status"?: string;
  "x-ms-policy-hash"?: string;
  "vm-configuration-secure-boot"?: boolean;
  "vm-configuration-secure-boot-template-id"?: string;
  "vm-configuration-tpm-enabled"?: boolean;
  "vm-configuration-vmUniqueId"?: string;
  "x-ms-sevsnpvm-authorkeydigest"?: string;
  "x-ms-sevsnpvm-bootloader-svn"?: number;
  "x-ms-sevsnpvm-familyId"?: string;
  "x-ms-sevsnpvm-guestsvn"?: number;
  "x-ms-sevsnpvm-hostdata"?: string;
  "x-ms-sevsnpvm-idkeydigest"?: string;
  "x-ms-sevsnpvm-imageId"?: string;
  "x-ms-sevsnpvm-is-debuggable"?: boolean;
  "x-ms-sevsnpvm-launchmeasurement"?: string;
  "x-ms-sevsnpvm-microcode-svn"?: number;
  "x-ms-sevsnpvm-migration-allowed"?: boolean;
  "x-ms-sevsnpvm-reportdata"?: string;
  "x-ms-sevsnpvm-reportid"?: string;
  "x-ms-sevsnpvm-smt-allowed"?: boolean;
  "x-ms-sevsnpvm-snpfw-svn"?: number;
  "x-ms-sevsnpvm-tee-svn"?: number;
  "x-ms-sevsnpvm-vmpl"?: number;
  "x-ms-ver"?: string;
  "signature-r"?: string;
  "signature-s"?: string;
  "uvm_endorsements-did"?: string;
  "uvm_endorsements-feed"?: string;
  "uvm_endorsements-svn"?: string;
}
