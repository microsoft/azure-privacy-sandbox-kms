// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { LogContext } from "../utils/Logger";

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

    // TODO: Check caller identity

    // TODO: Look up which proposal it is

    // TODO: Call proposal specific validation

    // TODO: Call proposal specific application

    return ServiceResult.Succeeded<IProposalResult>(new IProposalResult(), logContext);
}