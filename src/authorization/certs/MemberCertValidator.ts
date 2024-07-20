// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IValidatorService } from "../IValidationService";
import { ServiceResult } from "../../utils/ServiceResult";
import { UserMemberAuthnIdentity } from "./UserCertValidator";

/**
 * CCF member information
 * https://microsoft.github.io/CCF/main/audit/builtin_maps.html#members-info
 */
interface CCFMember {
  status: string;
}

export class MemberCertValidator implements IValidatorService {
  validate(request: ccfapp.Request<any>): ServiceResult<string> {
    const memberCaller = request.caller as unknown as UserMemberAuthnIdentity;
    const identityId = memberCaller.id;
    const isValid = this.isActiveMember(identityId);
    if (isValid.success && isValid.body) {
      return ServiceResult.Succeeded(identityId);
    }
    return ServiceResult.Failed({
      errorMessage: `Error: invalid caller identity (MemberCertValidator)->${JSON.stringify(isValid)}`,
      errorType: "AuthenticationError",
    });
  }

  /**
   * Checks if a member exists and active
   * @see https://microsoft.github.io/CCF/main/audit/builtin_maps.html#members-info
   * @param {string} memberId memberId to check if it exists and active
   * @returns {ServiceResult<boolean>}
   */
  public isActiveMember(memberId: string): ServiceResult<boolean> {
    const membersCerts = ccfapp.typedKv(
      "public:ccf.gov.members.certs",
      ccfapp.arrayBuffer,
      ccfapp.arrayBuffer,
    );

    const isMember = membersCerts.has(ccf.strToBuf(memberId));

    const membersInfo = ccfapp.typedKv(
      "public:ccf.gov.members.info",
      ccfapp.arrayBuffer,
      ccfapp.arrayBuffer,
    );

    const memberInfoBuf = membersInfo.get(ccf.strToBuf(memberId));
    if (memberInfoBuf !== undefined) {
      const memberInfo = ccf.bufToJsonCompatible(memberInfoBuf) as CCFMember;
      const isActiveMember = memberInfo && memberInfo.status === "Active";
      return ServiceResult.Succeeded(isActiveMember && isMember);
    } else {
      // memberInfoBuf is undefined
      return ServiceResult.Failed({
        errorMessage: "Member information is undefined.",
      });
    }
  }
}