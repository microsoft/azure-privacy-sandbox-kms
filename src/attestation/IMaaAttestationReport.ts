// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { JsonWebKeyRSAPublic } from "@microsoft/ccf-app/global";

export interface IMaaRuntime {
  keys?: JsonWebKeyRSAPublic[];
  "user-data"?: string;
  "vm-configuration"?: {
    "console-enabled"?: boolean;
    "root-cert-thumbprint"?: string;
    "secure-boot"?: boolean;
    "tpm-enabled"?: boolean;
    "tpm-persisted"?: boolean;
    vmUniqueId?: string;
  };
}

export interface IMaaIsolationTEE {
  "x-ms-attestation-type"?: string;
  "x-ms-compliance-status"?: string;
  "x-ms-runtime"?: IMaaRuntime;
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
}

export interface IMaaAttestationReport {
  secureboot?: boolean;
  "x-ms-attestation-type"?: string;
  "x-ms-azurevm-attestation-protocol-ver"?: string;
  "x-ms-azurevm-attested-pcrs"?: number[];
  "x-ms-azurevm-bootdebug-enabled"?: boolean;
  "x-ms-azurevm-dbvalidated"?: boolean;
  "x-ms-azurevm-dbxvalidated"?: boolean;
  "x-ms-azurevm-debuggersdisabled"?: boolean;
  "x-ms-azurevm-default-securebootkeysvalidated"?: boolean;
  "x-ms-azurevm-elam-enabled"?: boolean;
  "x-ms-azurevm-flightsigning-enabled"?: boolean;
  "x-ms-azurevm-hvci-policy"?: number;
  "x-ms-azurevm-hypervisordebug-enabled"?: boolean;
  "x-ms-azurevm-is-windows"?: boolean;
  "x-ms-azurevm-kerneldebug-enabled"?: boolean;
  "x-ms-azurevm-osbuild"?: string;
  "x-ms-azurevm-osdistro"?: string;
  "x-ms-azurevm-ostype"?: string;
  "x-ms-azurevm-osversion-major"?: number;
  "x-ms-azurevm-osversion-minor"?: number;
  "x-ms-azurevm-signingdisabled"?: boolean;
  "x-ms-azurevm-testsigning-enabled"?: boolean;
  "x-ms-azurevm-vmid"?: string;
  "x-ms-isolation-tee"?: IMaaIsolationTEE;
  "x-ms-policy-hash"?: string;
  "x-ms-runtime"?: {
    "client-payload"?: {
      a?: string;
    };
    keys?: JsonWebKeyRSAPublic[];
  };
  "x-ms-ver"?: string;
}
