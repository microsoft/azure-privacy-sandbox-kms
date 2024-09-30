// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IKeyReleasePolicySnpProps {
  "x-ms-attestation-type"?: string[] | string;
  "x-ms-compliance-status"?: string[] | string;
  "x-ms-policy-hash"?: string[] | string;
  "vm-configuration-secure-boot"?: boolean;
  "vm-configuration-secure-boot-template-id"?: string[] | string;
  "vm-configuration-tpm-enabled"?: boolean;
  "vm-configuration-vmUniqueId"?: string[] | string;
  "x-ms-sevsnpvm-authorkeydigest"?: string[] | string;
  "x-ms-sevsnpvm-bootloader-svn"?: number[] | number;
  "x-ms-sevsnpvm-familyId"?: string[] | string;
  "x-ms-sevsnpvm-guestsvn"?: number[] | number;
  "x-ms-sevsnpvm-hostdata"?: string[] | string;
  "x-ms-sevsnpvm-idkeydigest"?: string[] | string;
  "x-ms-sevsnpvm-imageId"?: string[] | string;
  "x-ms-sevsnpvm-is-debuggable"?: boolean;
  "x-ms-sevsnpvm-launchmeasurement"?: string[] | string;
  "x-ms-sevsnpvm-microcode-svn"?: number[] | number;
  "x-ms-sevsnpvm-migration-allowed"?: boolean;
  "x-ms-sevsnpvm-reportdata"?: string[] | string;
  "x-ms-sevsnpvm-reportid"?: string[] | string;
  "x-ms-sevsnpvm-smt-allowed"?: boolean;
  "x-ms-sevsnpvm-snpfw-svn"?: number[] | number;
  "x-ms-sevsnpvm-tee-svn"?: number[] | number;
  "x-ms-sevsnpvm-vmpl"?: number[] | number;
  "x-ms-ver"?: string[] | string;
}
