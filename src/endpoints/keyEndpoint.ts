// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf } from "@microsoft/ccf-app/global";
import * as ccfapp from "@microsoft/ccf-app";
import { ServiceResult } from "../utils/ServiceResult";
import { IWrapped, KeyWrapper } from "./KeyWrapper";
import { ISnpAttestation } from "../attestation/ISnpAttestation";
import { enableEndpoint, isPemPublicKey } from "../utils/Tooling";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";
import { IKeyItem } from "./IKeyItem";
import { KeyGeneration } from "./KeyGeneration";
import { validateAttestation } from "../attestation/AttestationValidation";
import { hpkeKeyIdMap, hpkeKeysMap } from "../repositories/Maps";
import { ServiceRequest } from "../utils/ServiceRequest";
import { LogContext, Logger } from "../utils/Logger";

// Enable the endpoint
enableEndpoint();

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

/**
 * Checks if the request has a wrapping key and returns the wrapping key and its hash.
 * @param body - The request body containing the wrapping key.
 * @returns A ServiceResult object containing the wrapping key and its hash if it exists, or an error message if it is missing or invalid.
 */
const requestHasWrappingKey = (
  body: IUnwrapRequest,
  logContextIn?: LogContext,
): ServiceResult<{ wrappingKey: ArrayBuffer; wrappingKeyHash: string }> => {
  const logContext = (logContextIn?.clone() || new LogContext()).appendScope("requestHasWrappingKey");
  let wrappingKey = body.wrappingKey;
  let wrappingKeyBuf: ArrayBuffer;
  let wrappingKeyHash: string;
  if (wrappingKey) {
    Logger.debug(`requestHasWrappingKey=> wrappingKey: '${wrappingKey}'`);
    if (!isPemPublicKey(wrappingKey)) {
      Logger.error(`Key-> Not a pem key`);
      return ServiceResult.Failed<{
        wrappingKey: ArrayBuffer;
        wrappingKeyHash: string;
      }>(
        {
          errorMessage: `${wrappingKey} not a PEM public key`,
        },
        400,
        logContext
      );
    }
    wrappingKeyBuf = ccf.strToBuf(wrappingKey);
    wrappingKeyHash = KeyGeneration.calculateHexHash(wrappingKeyBuf);
    Logger.debug(`Key->wrapping key hash: ${wrappingKeyHash}`);
    return ServiceResult.Succeeded({
      wrappingKey: wrappingKeyBuf,
      wrappingKeyHash,
    }, logContext);
  }

  return ServiceResult.Failed<{
    wrappingKey: ArrayBuffer;
    wrappingKeyHash: string;
  }>(
    {
      errorMessage: `Missing wrappingKey`,
    },
    400,
    logContext
  );
};

//#region KMS Key endpoints
// Get latest private key
export const key = (
  request: ccfapp.Request<IKeyRequest>,
): ServiceResult<string | IKeyResponse> => {
  const name = "key";
  const logContext = new LogContext().appendScope(name);
  const serviceRequest = new ServiceRequest<IKeyRequest>(logContext, request);
  let attestation: ISnpAttestation | undefined = undefined;

  // Check if serviceRequest.body is defined before accessing "attestation"
  if (serviceRequest.body && serviceRequest.body["attestation"]) {
    attestation = serviceRequest.body["attestation"];
  }

  // Validate input
  if (!serviceRequest.body || !attestation) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: The body is not a ${name} request: ${JSON.stringify(serviceRequest.body)}`,
      },
      400,
      logContext
    );
  }

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  let kid = serviceRequest.query?.["kid"];
  let id: number | undefined;
  if (kid === undefined) {
    [id, kid] = hpkeKeyIdMap.latestItem();
    if (kid === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: `${name}: No keys in store` },
        400,
        logContext
      );
    }
  }

  const fmt = serviceRequest.query?.["fmt"] || "jwk";
  if (!(fmt === "jwk" || fmt === "tink")) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
      },
      400,
      logContext
    );
  }

  let validateAttestationResult: ServiceResult<string | IAttestationReport>;
  try {
    validateAttestationResult = validateAttestation(attestation);
    if (!validateAttestationResult.success) {
      return ServiceResult.Failed<string>(
        validateAttestationResult.error!,
        validateAttestationResult.statusCode,
        logContext
      );
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Error in validating attestation (${attestation}): ${exception.message}`,
      },
      500,
      logContext
    );
  }

  // Be sure to request item and the receipt
  Logger.debug(`Get key with kid ${kid}`);
  const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
  if (keyItem === undefined) {
    return ServiceResult.Failed<string>(
      { errorMessage: `${name}: kid ${kid} not found in store` },
      404,
      logContext
    );
  }
  const receipt = hpkeKeysMap.receipt(kid);

  if (validateAttestationResult.statusCode === 202) {
    return ServiceResult.Accepted(logContext);
  }

  // Get receipt if available
  if (receipt !== undefined) {
    keyItem.receipt = receipt;
    Logger.debug(`Key->Receipt: ${receipt}`);
  } else {
    return ServiceResult.Accepted(logContext);
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
    return ServiceResult.Succeeded(response, logContext);
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `${name}: Error Key (${id}): ${exception.message}` },
      500,
      logContext
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
  const name = "unwrapKey";
  const logContext = new LogContext().appendScope(name);
  const serviceRequest = new ServiceRequest<IKeyRequest>(logContext, request);

  let attestation: ISnpAttestation | undefined = undefined;

  // Check if serviceRequest.body is defined before accessing "attestation"
  if (serviceRequest.body && serviceRequest.body["attestation"]) {
    attestation = serviceRequest.body["attestation"];
  }

  // Repeat the check wherever serviceRequest.body["attestation"] is accessed
  if (serviceRequest.body && serviceRequest.body["attestation"]) {
    attestation = serviceRequest.body["attestation"];
  }

  // Validate input
  if (!serviceRequest.body || !attestation) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: The body is not a ${name} request: ${JSON.stringify(serviceRequest.body)}`,
      },
      400,
      logContext
    );
  }

  // check if caller has a valid identity
  const [_, isValidIdentity] = serviceRequest.isAuthenticated();
  if (isValidIdentity.failure) return isValidIdentity;

  // check payload
  const wrappedKid: string = serviceRequest.body["wrappedKid"];
  if (wrappedKid === undefined) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Missing  ${name} wrappedKid in request: ${JSON.stringify(serviceRequest.body)}`,
      },
      400,
      logContext
    );
  }

  const wrappingKeyFromRequest = requestHasWrappingKey(
    serviceRequest.body as IUnwrapRequest,
  );
  if (wrappingKeyFromRequest.success === false) {
    // WrappingKey has errors
    return ServiceResult.Failed<string>(
      wrappingKeyFromRequest.error!,
      wrappingKeyFromRequest.statusCode,
      logContext,
    );
  }

  const wrappingKeyBuf = wrappingKeyFromRequest.body!.wrappingKey;
  const wrappingKeyHash = KeyGeneration.calculateHexHash(wrappingKeyBuf);
  Logger.debug(`unwrapKey->wrapping key hash: ${wrappingKeyHash}`);

  const fmt = serviceRequest.query?.["fmt"] || "jwk";
  if (!(fmt === "jwk" || fmt === "tink")) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
      },
      400,
      logContext
    );
  }

  // Validate attestation
  let validateAttestationResult: ServiceResult<string | IAttestationReport>;
  try {
    validateAttestationResult = validateAttestation(attestation);
    if (!validateAttestationResult.success) {
      return ServiceResult.Failed<string>(
        validateAttestationResult.error!,
        validateAttestationResult.statusCode,
        logContext
      );
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}: Error in validating attestation (${attestation}): ${exception.message}`,
      },
      500,
      logContext
    );
  }

  // Check if wrapping key match attestation
  if (
    !validateAttestationResult.body!["x-ms-sevsnpvm-reportdata"].startsWith(
      wrappingKeyHash,
    )
  ) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `${name}:wrapping key hash ${validateAttestationResult.body!["x-ms-sevsnpvm-reportdata"]} does not match wrappingKey`,
      },
      400,
      logContext
    );
  }

  // Be sure to request item and the receipt
  Logger.debug(`Get key with kid ${wrappedKid}`);
  const keyItem = hpkeKeysMap.store.get(wrappedKid) as IKeyItem;
  if (keyItem === undefined) {
    return ServiceResult.Failed<string>(
      { errorMessage: `${name}:kid ${wrappedKid} not found in store` },
      404,
      logContext
    );
  }

  const receipt = hpkeKeysMap.receipt(wrappedKid);

  // Get receipt if available, otherwise return accepted
  if (receipt !== undefined) {
    keyItem.receipt = receipt;
    Logger.debug(`Key->Receipt: ${receipt}`);
  } else {
    return ServiceResult.Accepted(logContext);
  }

  // Get wrapped key
  try {
    if (fmt == "tink") {
      Logger.debug(`Retrieve key in tink format`);
      const wrapped = KeyWrapper.createWrappedPrivateTinkKey(
        wrappingKeyBuf,
        keyItem,
      );
      const ret: IUnwrapResponse = { wrapped, receipt };
      return ServiceResult.Succeeded<IUnwrapResponse>(ret, logContext);
    } else {
      // Default is JWT.
      const wrapped = KeyWrapper.wrapKeyJwt(wrappingKeyBuf, keyItem);
      const ret = { wrapped, receipt };
      return ServiceResult.Succeeded<IUnwrapResponse>(ret, logContext);
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `${name}: Error (${wrappedKid}): ${exception.message}` },
      500,
      logContext
    );
  }
};

//#endregion
