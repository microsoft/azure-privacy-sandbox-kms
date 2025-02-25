// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { LogContext, Logger } from "../utils/Logger";
import { actions } from '../actions/actions';
import { ServiceRequest } from "../utils/ServiceRequest";

// This file serves to emulate a simplified version CCF's governance mechanism.
// This allows governance type operations on CCF platforms which don't expose
// governance, such as Azure Confidential Ledger.

// Currently all proposals will be automatically accepted, and regulation comes
// from which identities can successfully call this endpoint.

class IProposalVotes {}

class IProposalResult {
    ballot_count: number;
    proposal_id: string;
    proposer_id: string;
    state: string;
    votes: IProposalVotes;

    // TODO: Properly generate proposal fields
    constructor(
        // ballot_count: number,
        // proposal_id: string,
        // proposer_id: string,
        // state: string,
        // votes: IProposalVotes,
    ) {
        this.ballot_count = 0;
        this.proposal_id = "proposal_id";
        this.proposer_id = "proposer_id";
        this.state = "state";
        this.votes = {};
    }
}

export const proposals = (
  request: ccfapp.Request<void>,
): ServiceResult<string | IProposalResult> => {

    const logContext = new LogContext().appendScope("proposals");
    const serviceRequest = new ServiceRequest<void>(logContext, request);

    // Check caller identity
    const [_, isValidIdentity] = serviceRequest.isAuthenticated();
    if (isValidIdentity.failure) return isValidIdentity;

    // Extract settings policy from request
    // TODO: Use actual input values
    const args = {
        settings_policy: {
            service: {
                name: "test_kms",
                description: "test description",
                version: "1.0.4",
                debug: true,
            }
        }
    }

    // Look up which proposal it is
    // TODO: Use actual input values
    const action = actions.get("set_settings_policy");
    if (action === undefined) {
        return ServiceResult.Failed<IProposalResult>(
            { errorMessage: `Proposal not found` },
            404,
            logContext,
        );
    }

    // TODO: Call proposal specific validation
    action.validate(args);

    // TODO: Call proposal specific application
    action.apply(args);

    return ServiceResult.Succeeded<IProposalResult>(new IProposalResult(), logContext);
}