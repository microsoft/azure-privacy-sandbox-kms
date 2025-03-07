// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { LogContext, Logger } from "../utils/Logger";
import { actions } from '../actions/actions';
import { ServiceRequest } from "../utils/ServiceRequest";
import { ccf } from "@microsoft/ccf-app/global";

// This file serves to emulate a simplified version CCF's governance mechanism.
// This allows governance type operations on CCF platforms which don't expose
// governance, such as Azure Confidential Ledger.

// Currently all proposals will be automatically accepted, and regulation comes
// from which identities can successfully call this endpoint.

declare const acl: any;

function digest(jsonLike) {
    return Array.from(new Uint8Array(
        ccf.crypto.digest("SHA-256", ccf.jsonCompatibleToBuf(jsonLike))
    ))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
}

interface IProposalsAction {
    name: string;
    args: any;
}

interface IProposalsRequest {
    actions: IProposalsAction[];
}

class IProposalVotes {}

class IProposalResult {
    ballot_count: number;
    proposal_id: string;
    proposer_id: string;
    state: string;
    votes: IProposalVotes;

    // ballot_count, state and votes can be hardcoded as long as we don't
    // implement a voting system
    constructor(
        // ballot_count: number,
        proposal_id: string,
        proposer_id: string,
        // state: string,
        // votes: IProposalVotes,
    ) {
        this.ballot_count = 0;
        this.proposal_id = proposal_id;
        this.proposer_id = proposer_id;
        this.state = "state";
        this.votes = {};
    }
}

function isAuthType(identity: ccfapp.AuthnIdentityCommon, auth_type: string): boolean {
    return (identity.policy == auth_type ||
        (
            Array.isArray(identity.policy) &&
            identity.policy.includes(auth_type)
        )
    );
}

export const proposals = (
  request: ccfapp.Request<IProposalsRequest>,
): ServiceResult<string | IProposalResult[]> => {

    const logContext = new LogContext().appendScope("proposals");
    const serviceRequest = new ServiceRequest<void>(logContext, request);

    // Check caller identity
    const [_, isValidIdentity] = serviceRequest.isAuthenticated();
    if (isValidIdentity.failure) return isValidIdentity;

    // Handle ACL based authentication
    if (typeof acl === "object") {
        Logger.info("Checking permissions of ACL identity", logContext);

        let callerId: string;

        if (isAuthType(request.caller!, "user_cert")) {
            callerId = acl.certUtils.convertToAclFingerprintFormat();
        } else if (isAuthType(request.caller!, "jwt")) {
            callerId = (request.caller! as ccfapp.JwtAuthnIdentity).jwt.payload.oid;
        } else {
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: "Unexpected member_cert auth on ACL" },
                500,
                logContext,
            );
        }

        Logger.info(
            `ACL identity: ${JSON.stringify(callerId)}`,
            logContext,
        );

        // For now this code will always return false, I suspect because we can't
        // read the confidential ledger CCF tables.
        if (!acl.authz.actionAllowed(callerId, "/propose")) {
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: "Caller doesn't have the /propose permission" },
                401,
                logContext,
            );
        }

    } else if (!isAuthType(request.caller!, "member_cert")) {
        return ServiceResult.Failed<IProposalResult[]>(
            { errorMessage: "On raw CCF, we must use member cert authentication" },
            401,
            logContext,
        );
    }

    // Extract settings policy from request
    let proposalActions: IProposalsAction[] = [];
    if (serviceRequest.body && serviceRequest.body["actions"]) {
        proposalActions = serviceRequest.body["actions"];
    }

    let proposalResults: IProposalResult[] = [];

    // Iterate through the proposed actions
    for (const proposalAction of proposalActions) {

        // Look up which proposal it is
        const action = actions.get(proposalAction.name);
        if (action === undefined) {
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: `Proposal not found` },
                404,
                logContext,
            );
        }

        action.validate(proposalAction.args);
        action.apply(proposalAction.args);

        proposalResults.push(new IProposalResult(
            digest(proposalAction.args),
            digest(request.caller || {})
        ));
    }

    return ServiceResult.Succeeded<IProposalResult[]>(proposalResults, logContext);
}