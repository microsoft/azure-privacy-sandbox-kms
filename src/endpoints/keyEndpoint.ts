// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf } from "@microsoft/ccf-app/global";
import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IWrapped, IWrappedJwt, KeyWrapper } from "./KeyWrapper";
import { ISnpAttestation } from "../attestation/ISnpAttestation";
import { AuthenticationService } from "../authorization/AuthenticationService";
import { enableEndpoint, isPemPublicKey, queryParams } from "../utils/Tooling";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";
import { IKeyItem } from "./IKeyItem";
import { KeyGeneration } from "./KeyGeneration";
import { validateAttestation } from "../attestation/AttestationValidation";
import { hpkeKeyIdMap, hpkeKeysMap } from "../repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";

//#region Key endpoints interface
export interface IKeyRequest {
  attestation: ISnpAttestation;
  wrappingKey?: string;
}

export interface IKeyResponse {
  wrappedKid: string;
  receipt: string;
  wrapped: string;
}

interface IUnwrapRequest {
  wrapped: string;
  wrappedKid: string;
  attestation: ISnpAttestation;
  wrappingKey: string;
}
export interface IUnwrapResponse {
  wrapped: string;
  receipt: string;
}
//#endregion

// Enable the endpoint
enableEndpoint();

/**
 * Checks if the request has a wrapping key and returns the wrapping key and its hash.
 * @param body - The request body containing the wrapping key.
 * @returns A ServiceResult object containing the wrapping key and its hash if it exists, or an error message if it is missing or invalid.
 */
const requestHasWrappingKey = (
  body: IUnwrapRequest,
): ServiceResult<{ wrappingKey: ArrayBuffer; wrappingKeyHash: string }> => {
  let wrappingKey = body.wrappingKey;
  let wrappingKeyBuf: ArrayBuffer;
  let wrappingKeyHash: string;
  if (wrappingKey) {
    console.log(`requestHasWrappingKey=> wrappingKey: '${wrappingKey}'`);
    if (!isPemPublicKey(wrappingKey)) {
      console.log(`Key-> Not a pem key`);
      return ServiceResult.Failed<{
        wrappingKey: ArrayBuffer;
        wrappingKeyHash: string;
      }>(
        {
          errorMessage: `${wrappingKey} not a PEM public key`,
        },
        400,
      );
    }
    wrappingKeyBuf = ccf.strToBuf(wrappingKey);
    wrappingKeyHash = KeyGeneration.calculateHexHash(wrappingKeyBuf);
    console.log(`Key->wrapping key hash: ${wrappingKeyHash}`);
    return ServiceResult.Succeeded({
      wrappingKey: wrappingKeyBuf,
      wrappingKeyHash,
    });
  }

  return ServiceResult.Failed<{
    wrappingKey: ArrayBuffer;
    wrappingKeyHash: string;
  }>(
    {
      errorMessage: `Missing wrappingKey`,
    },
    400,
  );
};

//#region KMS Key endpoints
// Get latest private key
export const key = (
  request: ccfapp.Request<IKeyRequest>,
): ServiceResult<string | IKeyResponse> => {
  const serviceRequest = new ServiceRequest<IKeyRequest>("key", request);
  let attestation: ISnpAttestation;
  if (serviceRequest.body["attestation"]) {
    attestation = serviceRequest.body["attestation"];
  }

  // Validate input
  if (!serviceRequest.body || !attestation) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `The body is not a key request: ${JSON.stringify(serviceRequest.body)}`,
      },
      400,
    );
  }

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  let kid: string;
  let id: number;
  if (serviceRequest.query && serviceRequest.query["kid"]) {
    kid = serviceRequest.query["kid"];
  } else {
    [id, kid] = hpkeKeyIdMap.latestItem();
    if (kid === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: `No keys in store` },
        400,
      );
    }
  }

  const fmt = serviceRequest.query?.["fmt"] || "jwk";
  if (!(fmt === "jwk" || fmt === "tink")) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
      },
      400,
    );
  }

  let validateAttestationResult: ServiceResult<string | IAttestationReport>;
  try {
    validateAttestationResult = validateAttestation(attestation);
    if (!validateAttestationResult.success) {
      return ServiceResult.Failed<string>(
        validateAttestationResult.error,
        validateAttestationResult.statusCode,
      );
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `Error in validating attestation (${attestation}): ${exception.message}`,
      },
      500,
    );
  }

  // Be sure to request item and the receipt
  console.log(`Get key with kid ${kid}`);
  const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
  if (keyItem === undefined) {
    return ServiceResult.Failed<string>(
      { errorMessage: `kid ${kid} not found in store` },
      404,
    );
  }
  const receipt = hpkeKeysMap.receipt(kid);

  if (validateAttestationResult.statusCode === 202) {
    return ServiceResult.Accepted();
  }

  // Get receipt if available
  if (receipt !== undefined) {
    keyItem.receipt = receipt;
    console.log(`Key->Receipt: ${receipt}`);
  } else {
    return ServiceResult.Accepted();
  }

  // Get wrapped key
  try {
    let wrapped: string | IWrapped;
    if (fmt == "tink") {
      wrapped = KeyWrapper.wrapKeyTink(undefined, keyItem);
      wrapped = JSON.stringify(wrapped);
    } else {
      // Default is JWT.
      wrapped = KeyWrapper.wrapKeyJwt(undefined, keyItem);
    }

    const response: IKeyResponse = {
      wrappedKid: kid,
      wrapped,
      receipt,
    };
    console.log(
      `key api returns (${id}: ${JSON.stringify(response).length}): `,
      response,
    );
    return ServiceResult.Succeeded(response);
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Error Key (${id}): ${exception.message}` },
      500,
    );
  }
};

/**
 * Unwrap private key
 *
 * @param request - The request object containing the key unwrapping details.
 * @returns A `ServiceResult` containing either the unwrapped key or an error message.
 */
export const unwrapKey = (
  request: ccfapp.Request<IUnwrapRequest>,
): ServiceResult<string | IUnwrapResponse> => {
  // check if caller has a valid identity
  const [_, isValidIdentity] = new AuthenticationService().isAuthenticated(
    request,
  );
  console.log(
    `Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`,
  );
  if (isValidIdentity.failure) return isValidIdentity;

  // check payload
  const body = request.body.json();
  const attestation: ISnpAttestation = body["attestation"];
  const wrappedKid: string = body["wrappedKid"];
  console.log(`unwrapKey=> wrappedKid:`, wrappedKid);
  const wrappingKey: string = body["wrappingKey"];
  console.log(`unwrapKey=> wrappingKey: ${wrappingKey}`);
  const wrappingKeyFromRequest = requestHasWrappingKey(body);
  console.log(`unwrapKey->wrappingKeyFromRequest: `, wrappingKeyFromRequest);

  if (wrappingKeyFromRequest.success === false) {
    // WrappingKey has errors
    return ServiceResult.Failed<string>(
      wrappingKeyFromRequest.error,
      wrappingKeyFromRequest.statusCode,
    );
  }

  if (!wrappingKeyFromRequest.body.wrappingKey) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `Missing wrappingKey in request`,
      },
      400,
    );
  }

  const wrappingKeyBuf = wrappingKeyFromRequest.body.wrappingKey;
  const wrappingKeyHash = KeyGeneration.calculateHexHash(wrappingKeyBuf);
  console.log(`unwrapKey->wrapping key hash: ${wrappingKeyHash}`);

  // Gen
  // Validate input
  if (!body || !wrappedKid || !attestation || !wrappingKey) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `The body is not a unwrap key request: ${JSON.stringify(body)}`,
      },
      400,
    );
  }

  const query = queryParams(request);
  let fmt = "jwk";
  if (query && query["fmt"]) {
    fmt = query["fmt"];
    if (!(fmt === "jwk" || fmt === "tink")) {
      return ServiceResult.Failed<string>(
        {
          errorMessage: `Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
        },
        400,
      );
    }
  }

  // validate attestation
  const validateAttestationResult = validateAttestation(attestation);
  if (!validateAttestationResult.success) {
    return ServiceResult.Failed<string>(
      validateAttestationResult.error,
      validateAttestationResult.statusCode,
    );
  }

  // Check if wrapping key match attestation
  if (
    !validateAttestationResult.body["x-ms-sevsnpvm-reportdata"].startsWith(
      wrappingKeyHash,
    )
  ) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `wrapping key hash ${validateAttestationResult.body["x-ms-sevsnpvm-reportdata"]} does not match wrappingKey`,
      },
      400,
    );
  }

  // Be sure to request item and the receipt
  console.log(`Get key with kid ${wrappedKid}`);
  const keyItem = hpkeKeysMap.store.get(wrappedKid) as IKeyItem;
  if (keyItem === undefined) {
    return ServiceResult.Failed<string>(
      { errorMessage: `kid ${wrappedKid} not found in store` },
      404,
    );
  }

  const receipt = hpkeKeysMap.receipt(wrappedKid);

  // Get receipt if available, otherwise return accepted
  if (receipt !== undefined) {
    keyItem.receipt = receipt;
    console.log(`Key->Receipt: ${receipt}`);
  } else {
    return ServiceResult.Accepted();
  }

  // Get wrapped key
  try {
    let wrapKey;
    if (fmt == "tink") {
      console.log(`Retrieve key in tink format`);
      const wrapped = KeyWrapper.createWrappedPrivateTinkKey(
        wrappingKeyBuf,
        keyItem,
      );
      const ret: IUnwrapResponse = { wrapped, receipt };
      console.log(
        `key tink returns (${wrappedKid}, ${JSON.stringify(wrapped).length}): `,
        ret,
      );
      return ServiceResult.Succeeded<IUnwrapResponse>(ret);
    } else {
      // Default is JWT.
      console.log(
        `Retrieve key in JWK format (${wrappingKey.length}): ${wrappingKey}`,
      );
      const wrapped = KeyWrapper.wrapKeyJwt(wrappingKeyBuf, keyItem);
      const ret = { wrapped, receipt };
      console.log(`key JWT returns (${wrappedKid}, ${wrapped.length}): `, ret);
      return ServiceResult.Succeeded<IUnwrapResponse>(ret);
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Error unwrap (${wrappedKid}): ${exception.message}` },
      500,
    );
  }
};

//#endregion
