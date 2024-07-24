// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SnpAttestationResult } from "@microsoft/ccf-app/global";
import { IAttestationReport } from "./ISnpAttestationReport";

export class SnpAttestationClaims {
  constructor(public report: SnpAttestationResult) {}

  private hex(buf: ArrayBuffer) {
    return Array.from(new Uint8Array(buf))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  }

  public getClaims(): IAttestationReport {
    const reportClaims: IAttestationReport = {};
    let val: any = this.report?.attestation?.version;
    if (val !== undefined) {
      reportClaims["x-ms-ver"] = val.toString();
    }
    val = this.report?.attestation?.guest_svn;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-guestsvn"] = val;
    }
    //policy.abi_minor
    //policy.abi_major
    val = this.report?.attestation?.policy?.smt;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-smt-allowed"] = val === 1;
    }
    // policy.migrate_ma
    val = this.report?.attestation?.policy?.debug;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-is-debuggable"] = val === 1;
    }
    //policy.single_socket
    val = this.report?.attestation?.family_id;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-familyId"] = this.hex(val);
    }
    val = this.report?.attestation?.image_id;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-imageId"] = this.hex(val);
    }
    val = this.report?.attestation?.vmpl;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-vmpl"] = val;
    }
    // signature_algo
    // platform_version: TcbVersion;
    //platform_info: {
    //    smt_en: number;
    //    tsme_en: number;
    //};
    // flags.author_key_en
    // flags.mask_chip_key
    // flags.signing_key
    val = this.report?.attestation?.report_data;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-reportdata"] = this.hex(val);
    }
    val = this.report?.attestation?.measurement;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-launchmeasurement"] = this.hex(val);
    }
    val = this.report?.attestation?.host_data;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-hostdata"] = this.hex(val);
    }
    val = this.report?.attestation?.id_key_digest;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-idkeydigest"] = this.hex(val);
    }
    val = this.report?.attestation?.author_key_digest;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-authorkeydigest"] = this.hex(val);
    }
    val = this.report?.attestation?.report_id;
    if (val !== undefined) {
      reportClaims["x-ms-sevsnpvm-reportid"] = this.hex(val);
    }
    // report_id_ma
    // reported_tcb
    // chip_id
    // committed_tcb
    // current_minor
    // current_build
    // committed_minor
    // committed_major
    // launch_tcb
    val = this.report?.attestation?.signature?.r;
    if (val !== undefined) {
      reportClaims["signature-r"] = this.hex(val);
    }
    val = this.report?.attestation?.signature?.s;
    if (val !== undefined) {
      reportClaims["signature-s"] = this.hex(val);
    }
    val = this.report?.uvm_endorsements?.did;
    if (val !== undefined) {
      reportClaims["uvm_endorsements-did"] = val;
    }
    val = this.report?.uvm_endorsements?.feed;
    if (val !== undefined) {
      reportClaims["uvm_endorsements-feed"] = val;
    }
    val = this.report?.uvm_endorsements?.svn;
    if (val !== undefined) {
      reportClaims["uvm_endorsements-svn"] = val;
    }

    return reportClaims;
  }
}
