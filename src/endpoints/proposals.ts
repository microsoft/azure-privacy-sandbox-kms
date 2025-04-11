// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { LogContext, Logger } from "../utils/Logger";
import { getCoseProtectedHeader } from "../utils/cose";
import { actions } from '../actions/actions';
import { ServiceRequest } from "../utils/ServiceRequest";
import { ccf } from "@microsoft/ccf-app/global";
import { proposalsPolicyMap } from "../repositories/Maps";

// This file serves to emulate a simplified version CCF's governance mechanism.
// This allows governance type operations on CCF platforms which don't expose
// governance, such as Azure Confidential Ledger.

// Currently all proposals will be automatically accepted, and regulation comes
// from which identities can successfully call this endpoint.

// This is a module of code provided by ACL.
declare const acl: any;

const proposalsToKeep = 5;

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
        this.state = "Accepted";
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
        Logger.debug("Checking permissions of ACL identity", logContext);

        let callerId: string;

        if (isAuthType(request.caller!, "user_cose_sign1")) {
            // Convert from 12ab34cd format to 12:AB:34:CD
            callerId = (request.caller! as ccfapp.UserCOSESign1AuthnIdentity).id
                .toUpperCase()
                .match(/.{1,2}/g)
                ?.join(":")!;
        } else {
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: "Unexpected member_cert auth on ACL" },
                500,
                logContext,
            );
        }

        if (callerId === undefined || callerId == "") {
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: "Caller ID is undefined" },
                500,
                logContext,
            );
        }

        Logger.info(
            `ACL identity: ${JSON.stringify(callerId)}`,
            logContext,
        );

        const roleMappingTable = ccf.kv["public:confidentialledger.roles.user_roles_mapping"]!;

        // Wrap the callerId in quotes to match the format in the role mapping table
        const userRoles = roleMappingTable.get(ccf.strToBuf(`\"${callerId}\"`));

        // If the user isn't admin or contibutor, return a 401
        const roles = userRoles ? ccf.bufToJsonCompatible<Array<string>>(userRoles) : [];
        if (!(roles.includes("Administrator") || roles.includes("Contributor"))) {
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: "Caller doesn't have the ledger/append permission" },
                401,
                logContext,
            );
        }
    }

    // Handle a COSE Sign1 payload
    let requestBody = ccf.bufToJsonCompatible(
        (request.caller as ccfapp.UserCOSESign1AuthnIdentity).cose.content
    );

    // Create a map from created time to proposal ID for historical proposals
    const createdTimeToProposalIdMap = new Map<number, ArrayBuffer>();
    proposalsPolicyMap.forEach((proposal, proposalId) => {
        createdTimeToProposalIdMap.set(
            getCoseProtectedHeader(proposal)["ccf.gov.msg.created_at"],
            proposalId
        );
    });

    // Ensure the proposal was created after the last accepted proposal
    const currentProposalCreatedAt = getCoseProtectedHeader(request.body.arrayBuffer())["ccf.gov.msg.created_at"];
    const lastAcceptedProposalCreatedAt = Math.max(...Array.from(createdTimeToProposalIdMap.keys()));
    if (currentProposalCreatedAt <= lastAcceptedProposalCreatedAt) {
        const errorMessage = `Proposal created before (${currentProposalCreatedAt}) last accepted proposal (${lastAcceptedProposalCreatedAt})`;
            Logger.error(errorMessage, logContext);
            return ServiceResult.Failed<IProposalResult[]>(
                { errorMessage: errorMessage },
                400,
                logContext,
            );
    }

    // Extract the proposal from request
    let proposalActions: IProposalsAction[] = [];
    if (requestBody && requestBody["actions"]) {
        proposalActions = requestBody["actions"];
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

    // Save the proposal to the table
    const proposalId = ccf.crypto.digest("SHA-256", request.body.arrayBuffer());
    proposalsPolicyMap.set(
        proposalId,
        request.body.arrayBuffer()
    );
    createdTimeToProposalIdMap.set(currentProposalCreatedAt, proposalId);

    // Keep the last N proposals
    const sortedCreatedTimes = Array.from(createdTimeToProposalIdMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i < sortedCreatedTimes.length - proposalsToKeep; i++) {
        proposalsPolicyMap.delete(createdTimeToProposalIdMap.get(sortedCreatedTimes[i])!);
    }

    return ServiceResult.Succeeded<IProposalResult[]>(proposalResults, logContext);
}