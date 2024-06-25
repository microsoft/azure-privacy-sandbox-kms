// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import {
  CryptoKeyPair,
  SnpAttestationResult,
  ccf,
  snp_attestation,
} from "@microsoft/ccf-app/global";
import { KeyStore } from "../repositories/KeyStore";
import { LastestItemStore } from "../repositories/LastestItemStore";
import { IKeyItem } from "./IKeyItem";
import { Base64 } from "js-base64";
import { IKeyReleasePolicyProps } from "../policies/IKeyReleasePolicyProps";
import { ISnpAttestation } from "../attestation/ISnpAttestation";
import { SnpAttestationClaims } from "../attestation/SnpAttestationClaims";
import { KeyGeneration } from "./KeyGeneration";
import { TinkKey, TinkPublicKey } from "./TinkKey";
import { IWrapped, IWrappedJwt, KeyWrapper } from "./KeyWrapper";
import { AuthenticationService } from "../authorization/AuthenticationService";
import { IAttestationReport } from "../attestation/ISnpAttestationReport";
import { ServiceResult } from "../utils/ServiceResult";
export interface IAttestationValidationResult {
  result: boolean;
  errorMessage?: string;
  statusCode: number;
  attestationClaims?: IAttestationReport;
}

export interface IWrappingKeyValidationResult {
  result: boolean;
  statusCode: number;
  body?: object;
  wrappingKeyHash?: string;
  wrappingKey?: ArrayBuffer;
}

export interface IKeyRequest {
  attestation: ISnpAttestation;
  wrappingKey?: string;
}

interface IUnwrapRequest {
  wrapped: string;
  wrappedKid: string;
  attestation: ISnpAttestation;
  wrappingKey: string;
}

//#region KMS Stores
// Stores
const hpkeKeysMap = new KeyStore("HpkeKeys");
const hpkeKeyIdMap = new LastestItemStore<number, string>("HpkeKeyids");
const keyReleaseMapName = "public:ccf.gov.policies.key_release";
const keyReleasePolicyMap = ccf.kv[keyReleaseMapName];
//#endregion

// Set CCF state for date and time
try {
  ccf.enableUntrustedDateTime(true);
} catch {
  // Will fail for unit tests. Do nothing
}

//#region KMS helpers
// Check for public PEM key
const isPemPublicKey = (key: string): boolean => {
  const beginPatternLiteral = /-----BEGIN PUBLIC KEY-----\\n/;
  const endPatternLiteral = /\\n-----END PUBLIC KEY-----\\n$/;
  const beginPatternNewline = /-----BEGIN PUBLIC KEY-----\n/;
  const endPatternNewline = /\n-----END PUBLIC KEY-----\n$/;
  const contentPattern = /([\s\S]+)/;

  const isLiteralNewline =
    beginPatternLiteral.test(key) && endPatternLiteral.test(key);
  const isNewline =
    beginPatternNewline.test(key) && endPatternNewline.test(key);

  console.log("isLiteralNewline:", isLiteralNewline);
  console.log("isNewline:", isNewline);

  return isLiteralNewline || isNewline;
};

// Get query parameters
const queryParams = (request: ccfapp.Request) => {
  const elements = request.query.split("&");
  let obj = {};
  for (let inx = 0; inx < elements.length; inx++) {
    const param = elements[inx].split("=");
    obj[param[0]] = param[1];
    console.log(`Query: ${param[0]} = ${param[1]}`);
  }
  return obj;
};

// Validate the attestation by means of the key release policy
const validateAttestation = (
  attestation: ISnpAttestation,
): ServiceResult<string | IAttestationReport> => {
  console.log(`Start attestation validation`);
  if (!attestation) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing attestation" },
      400,
    );
  }
  if (!attestation.evidence && typeof attestation.evidence !== "string") {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.evidence" },
      400,
    );
  }
  if (
    !attestation.endorsements &&
    typeof attestation.endorsements !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.evidence" },
      400,
    );
  }
  if (
    !attestation.uvm_endorsements &&
    typeof attestation.uvm_endorsements !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.uvm_endorsements" },
      400,
    );
  }
  if (
    !attestation.endorsed_tcb &&
    typeof attestation.endorsed_tcb !== "string"
  ) {
    return ServiceResult.Failed<string>(
      { errorMessage: "missing or bad attestation.endorsed_tcb" },
      400,
    );
  }
  let evidence: ArrayBuffer;
  let endorsements: ArrayBuffer;
  let uvm_endorsements: ArrayBuffer;

  try {
    evidence = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.evidence));
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: "Malformed attestation.evidence" },
      400,
    );
  }
  try {
    endorsements = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.endorsements));
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: "Malformed attestation.endorsements" },
      400,
    );
  }
  try {
    uvm_endorsements = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.uvm_endorsements));
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: "Malformed attestation.uvm_endorsements" },
      400,
    );
  }
  try {
    const endorsed_tcb = attestation.endorsed_tcb;

    const attestationReport: SnpAttestationResult =
      snp_attestation.verifySnpAttestation(
        evidence,
        endorsements,
        uvm_endorsements,
        endorsed_tcb,
      );
    console.log(
      `Attestation validation report: ${JSON.stringify(attestationReport)}`,
    );

    const claimsProvider = new SnpAttestationClaims(attestationReport);
    const attestationClaims = claimsProvider.getClaims();
    console.log(`Attestation claims: `, attestationClaims);
    console.log(`Report Data: `, attestationClaims["x-ms-sevsnpvm-reportdata"]);

    // Get the key release policy
    const keyReleasePolicy = getKeyReleasePolicy();
    console.log(
      `Key release policy: ${JSON.stringify(
        keyReleasePolicy,
      )}, keys: ${Object.keys(keyReleasePolicy)}, keys: ${
        Object.keys(keyReleasePolicy).length
      }`,
    );

    if (Object.keys(keyReleasePolicy).length === 0) {
      return ServiceResult.Failed<string>(
        {
          errorMessage:
            "The key release policy is missing. Please propose a new key release policy",
        },
        400,
      );
    }

    for (let inx = 0; inx < Object.keys(keyReleasePolicy).length; inx++) {
      const key = Object.keys(keyReleasePolicy)[inx];

      // check if key is in attestation
      const attestationValue = attestationClaims[key];
      const policyValue = keyReleasePolicy[key];
      const isUndefined = typeof attestationValue === "undefined";
      console.log(
        `Checking key ${key}, typeof attestationValue: ${typeof attestationValue}, isUndefined: ${isUndefined}, attestation value: ${attestationValue}, policyValue: ${policyValue}`,
      );
      if (isUndefined) {
        return ServiceResult.Failed<string>(
          { errorMessage: `Missing claim in attestation: ${key}` },
          400,
        );
      }
      if (
        policyValue.filter((p) => {
          console.log(`Check if policy value ${p} === ${attestationValue}`);
          return p === attestationValue;
        }).length === 0
      ) {
        return ServiceResult.Failed<string>(
          {
            errorMessage: `Attestation claim ${key}, value ${attestationValue} does not match policy values: ${policyValue}`,
          },
          400,
        );
      }
    }

    return ServiceResult.Succeeded<IAttestationReport>(attestationClaims);
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Internal error: ${exception.message}` },
      500,
    );
  }
};

// Retrieve key release policy
const getKeyReleasePolicy = (): IKeyReleasePolicyProps => {
  const result: IKeyReleasePolicyProps = {};
  keyReleasePolicyMap.forEach((values: ArrayBuffer, key: ArrayBuffer) => {
    const kvKey = ccf.bufToStr(key);
    const kvValue = JSON.parse(ccf.bufToStr(values));
    result[kvKey] = kvValue;
    console.log(`key policy item with key: ${kvKey} and value: ${kvValue}`);
  });
  console.log(
    `Resulting key release policy: ${JSON.stringify(
      result,
    )}, keys: ${Object.keys(result)}, keys: ${Object.keys(result).length}`,
  );
  return result;
};

// Get endpoint headers for returning keys
export const setKeyHeaders = (): { [key: string]: string } => {
  const headers: { [key: string]: string } = {
    "cache-control": "max-age=254838",
    date: new Date().toUTCString(),
  };
  return headers;
};

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

//#endregion

//#region KMS Key endpoints

export interface IKeyResponse {
  wrappedKid: string;
  receipt: string;
  wrapped: string;
}

// Get latest private key
export const key = (request: ccfapp.Request<IKeyRequest>) => {
  const body = request.body.json();
  console.log(`Key->Request: `, body);
  let attestation: ISnpAttestation;
  if (body["attestation"]) {
    attestation = body["attestation"];
  }
  //console.log(`unwrapKey=> attestation:`, attestation);

  // Validate input
  if (!body || !attestation) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `The body is not a key request: ${JSON.stringify(body)}`,
      },
      400,
    );
  }

  // check if caller has a valid identity
  const [policy, isValidIdentity] = new AuthenticationService().isAuthenticated(
    request,
  );
  console.log(
    `Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`,
  );
  if (isValidIdentity.failure) return isValidIdentity;

  const query = queryParams(request);
  let kid: string;
  let id: number;
  if (query && query["kid"]) {
    kid = query["kid"];
  } else {
    [id, kid] = hpkeKeyIdMap.latestItem();
    if (kid === undefined) {
      return ServiceResult.Failed<string>(
        { errorMessage: `No keys in store` },
        400,
      );
    }
  }

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

  let validateAttestationResult: ServiceResult<string | IAttestationReport>;
  try {
    validateAttestationResult = validateAttestation(attestation);
    if (!validateAttestationResult.success) {
      return validateAttestationResult;
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
    return {
      statusCode: 202,
      headers: {
        "retry-after": 3,
      },
    };
  }

  // Get receipt if available
  if (receipt !== undefined) {
    keyItem.receipt = receipt;
    console.log(`Key->Receipt: ${receipt}`);
  } else {
    return {
      statusCode: 202,
      headers: {
        "retry-after": 3,
      },
    };
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
    return { body: response };
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Error Key (${id}): ${exception.message}` },
      500,
    );
  }
};

// Unwrap private key
export const unwrapKey = (
  request: ccfapp.Request<IUnwrapRequest>,
):
  | ServiceResult<string>
  | ServiceResult<{ wrapped: string; receipt: string }> => {
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
  //console.log(`unwrapKey=> wrapped:`, body);
  const attestation: ISnpAttestation = body["attestation"];
  //console.log(`unwrapKey=> attestation:`, attestation);
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

  if (!wrappingKeyFromRequest.content.wrappingKey) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `Missing wrappingKey in request`,
      },
      400,
    );
  }

  const wrappingKeyBuf = wrappingKeyFromRequest.content.wrappingKey;
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
    !validateAttestationResult.content["x-ms-sevsnpvm-reportdata"].startsWith(
      wrappingKeyHash,
    )
  ) {
    return ServiceResult.Failed<string>(
      {
        errorMessage: `wrapping key hash ${validateAttestationResult.content["x-ms-sevsnpvm-reportdata"]} does not match wrappingKey`,
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
      const ret = { wrapped, receipt };
      console.log(
        `key tink returns (${wrappedKid}, ${JSON.stringify(wrapped).length}): `,
        ret,
      );
      return ServiceResult.Succeeded<{ wrapped: string; receipt: string }>(ret);
    } else {
      // Default is JWT.
      console.log(
        `Retrieve key in JWK format (${wrappingKey.length}): ${wrappingKey}`,
      );
      const wrapped = KeyWrapper.wrapKeyJwt(wrappingKeyBuf, keyItem);
      const ret = { wrapped, receipt };
      console.log(`key JWT returns (${wrappedKid}, ${wrapped.length}): `, ret);
      return ServiceResult.Succeeded<{ wrapped: string; receipt: string }>(ret);
    }
  } catch (exception: any) {
    return ServiceResult.Failed<string>(
      { errorMessage: `Error unwrap (${wrappedKid}): ${exception.message}` },
      500,
    );
  }
};

// Get list of public keys
export const listpubkeys = () => {
  try {
    // Get last key
    const [id, kid] = hpkeKeyIdMap.latestItem();
    if (kid === undefined) {
      return {
        statusCode: 400,
        body: {
          error: {
            message: `No keys in store`,
          },
        },
      };
    }
    const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return {
        statusCode: 404,
        body: {
          error: {
            message: `kid ${kid} not found in store`,
          },
        },
      };
    }

    delete keyItem.d;
    const publicKey: any = new TinkPublicKey([keyItem]).get();

    const headers = setKeyHeaders();
    const ret = publicKey;
    console.log(`listpublickeys returns: ${JSON.stringify(ret)}`);
    return {
      headers,
      body: ret,
    };
  } catch (exception: any) {
    const error = `KMS internal error: ${exception.message}`;
    console.error(error);
    throw new Error(error);
  }
};

// Get latest public key
export const pubkey = (request: ccfapp.Request<void>) => {
  let id: number, keyItem: IKeyItem;
  try {
    const query = queryParams(request);
    let kid: string;
    let id: number;
    if (query && query["kid"]) {
      kid = query["kid"];
    } else {
      [id, kid] = hpkeKeyIdMap.latestItem();
      if (kid === undefined) {
        return {
          statusCode: 400,
          body: {
            error: {
              message: `No keys in store`,
            },
          },
        };
      }
    }

    let fmt = "jwk";
    if (query && query["fmt"]) {
      fmt = query["fmt"];
      if (!(fmt === "jwk" || fmt === "tink")) {
        return {
          statusCode: 400,
          body: {
            error: {
              message: `Wrong fmt query parameter '${kid}'. Must be jwt or tink.`,
            },
          },
        };
      }
    }

    console.log(`Get key with kid ${kid}`);
    const keyItem = hpkeKeysMap.store.get(kid) as IKeyItem;
    if (keyItem === undefined) {
      return {
        statusCode: 404,
        body: {
          error: {
            message: `kid ${kid} not found in store`,
          },
        },
      };
    }

    // Get receipt if available
    const receipt = hpkeKeysMap.receipt(kid);
    if (receipt !== undefined) {
      keyItem.receipt = receipt;
      console.log(`pubkey->Receipt: ${receipt}`);
    } else {
      return {
        statusCode: 202,
        headers: {
          "retry-after": 3,
        },
      };
    }

    delete keyItem.d;
    if (fmt === "tink") {
      const headers = setKeyHeaders();
      console.log(`response headers: `, headers, keyItem);
      const tinkKey = new TinkKey([keyItem]);
      console.log(`tinkKey: `, tinkKey);
      const publicKey: any = tinkKey.get();
      if (receipt !== undefined) {
        publicKey.receipt = receipt;
      }
      const ret = publicKey;
      console.log(`pubkey returns (${id}) in tink:`, ret);
      return {
        body: ret,
        headers,
      };
    }

    const ret = keyItem;
    console.log(`pubkey returns (${id}) in jwk: ${JSON.stringify(ret)}`);
    return { body: ret };
  } catch (exception: any) {
    const message = `Error pubkey (${id}): ${exception.message}`;
    console.error(message);
    return {
      statusCode: 500,
      body: {
        error: {
          message,
        },
        inner: exception,
      },
    };
  }
};
const hex = (buf: ArrayBuffer) => {
  return Array.from(new Uint8Array(buf))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
};

// Generate new key pair and store it on the store
export const refresh = (request: ccfapp.Request<void>) => {
  try {
    // Get HPKE key pair id
    const id = hpkeKeyIdMap.size + 1;

    // Generate HPKE key pair with a six digit id
    const keyItem = KeyGeneration.generateKeyItem(100000 + id);

    // Store HPKE key pair kid
    keyItem.kid = `${keyItem.kid!}_${id}`;
    hpkeKeyIdMap.storeItem(id, keyItem.kid);

    // Store HPKE key pair
    hpkeKeysMap.storeItem(keyItem.kid, keyItem, keyItem.x);
    console.log(`Key item with id ${id} and kid ${keyItem.kid} stored`);

    delete keyItem.d;
    const ret = keyItem;
    console.log(`refresh returns: ${JSON.stringify(ret)}`);
    return { body: ret };
  } catch (exception: any) {
    const error = `KMS internal error: ${exception.message}`;
    console.error(error);
    throw new Error(error);
  }
};

// Hearthbeat endpoint currently used ro test authorization
export const hearthbeat = (request: ccfapp.Request<void>) => {
  // check if caller has a valid identity
  const [policy, isValidIdentity] = new AuthenticationService().isAuthenticated(
    request,
  );
  console.log(
    `Authorization: isAuthenticated-> ${JSON.stringify(isValidIdentity)}`,
  );
  if (isValidIdentity.failure) return isValidIdentity;
  const body = policy;
  return {
    body,
  };
};

//#endregion

//#region KMS Policies
export const key_release_policy = () => {
  const result = getKeyReleasePolicy();
  const ret = result;
  console.log(`key_release_policy returns: ${JSON.stringify(ret)}`);
  return { body: ret };
};
//#endregion
