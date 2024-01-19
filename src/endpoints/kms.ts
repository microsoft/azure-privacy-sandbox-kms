// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import {
  SnpAttestationResult,
  ccf,
  snp_attestation,
} from "@microsoft/ccf-app/global";
import { KeyStore } from "../repositories/KeyStore";
import { LastestItemStore } from "../repositories/LastestItemStore";
import { IKeyItem, IWrapKey } from "./IKeyItem";
import { Base64 } from "js-base64";
import { IKeyReleasePolicyProps } from "../policies/IKeyReleasePolicyProps";
import { ISnpAttestation } from "../attestation/ISnpAttestation";
import { SnpAttestationClaims } from "../attestation/SnpAttestationClaims";
import { KeyGeneration } from "./KeyGeneration";
import { TinkKey, TinkPublicKey } from "./TinkKey";
import { IWrapped, IWrappedJwt, KeyWrapper } from "./KeyWrapper";

export interface IValidatePolicy {
  result: boolean;
  errorMessage?: string;
  statusCode: number;
}

//#region KMS Stores
// Stores
const hpkeKeysMap = new KeyStore("HpkeKeys");
const wrapKeysMap = new KeyStore("WrapKeys");
const hpkeKeyIdMap = new LastestItemStore<number, string>("HpkeKeyids");
const wrapKeyIdMap = new LastestItemStore<number, string>("WrapKeyids");
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
const validateAttestation = (attestation: ISnpAttestation): IValidatePolicy => {
  console.log(`Start attestation validation`);
  if (!attestation) {
    return {
      result: false,
      errorMessage: "missing attestation",
      statusCode: 400,
    };
  }
  if (!attestation.evidence && typeof attestation.evidence !== "string") {
    return {
      result: false,
      errorMessage: "missing or bad attestation.evidence",
      statusCode: 400,
    };
  }
  if (
    !attestation.endorsements &&
    typeof attestation.endorsements !== "string"
  ) {
    return {
      result: false,
      errorMessage: "missing or bad attestation.endorsements",
      statusCode: 400,
    };
  }
  if (
    !attestation.uvm_endorsements &&
    typeof attestation.uvm_endorsements !== "string"
  ) {
    return {
      result: false,
      errorMessage: "missing or bad attestation.uvm_endorsements",
      statusCode: 400,
    };
  }
  if (
    !attestation.endorsed_tcb &&
    typeof attestation.endorsed_tcb !== "string"
  ) {
    return {
      result: false,
      errorMessage: "missing or bad attestation.endorsed_tcb",
      statusCode: 400,
    };
  }
  let evidence: ArrayBuffer;
  let endorsements: ArrayBuffer;
  let uvm_endorsements: ArrayBuffer;

  try {
    evidence = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.evidence));
  } catch (exception: any) {
    return {
      result: false,
      errorMessage: `Malformed attestation.evidence.`,
      statusCode: 400,
    };
  }
  try {
    endorsements = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.endorsements));
  } catch (exception: any) {
    return {
      result: false,
      errorMessage: `Malformed attestation.endorsements.`,
      statusCode: 400,
    };
  }
  try {
    uvm_endorsements = ccfapp
      .typedArray(Uint8Array)
      .encode(Base64.toUint8Array(attestation.uvm_endorsements));
  } catch (exception: any) {
    return {
      result: false,
      errorMessage: `Malformed attestation.uvm_endorsements.`,
      statusCode: 400,
    };
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
    console.log(`Attestation claims: ${JSON.stringify(attestationClaims)}`);

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
      return {
        result: false,
        errorMessage:
          "The key release policy is missing. Please propose a new key release policy",
        statusCode: 400,
      };
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
        console.log(`Policy claim ${key} is missing from attestation`);
        return {
          result: false,
          errorMessage: `Missing claim in attestation: ${key}`,
          statusCode: 400,
        };
      }
      if (
        policyValue.filter((p) => {
          console.log(`Check if policy value ${p} === ${attestationValue}`);
          return p === attestationValue;
        }).length === 0
      ) {
        return {
          result: false,
          errorMessage: `Attestation claim ${key}, value ${attestationValue} does not match policy values: ${policyValue}`,
          statusCode: 400,
        };
      }
    }

    return {
      result: true,
      statusCode: 200,
    };
  } catch (exception: any) {
    return {
      result: false,
      errorMessage: `Internal error: ${exception.message}.`,
      statusCode: 500,
    };
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
//#endregion

//#region KMS Key endpoints

// Get latest private key
export const key = (request: ccfapp.Request<ISnpAttestation>) => {
  console.log(`Key attestation: ${JSON.stringify(request || {})}`);
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
            message: `Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
          },
        },
      };
    }
  }

  console.log(`Get key with kid ${kid}`);

  const attestation: ISnpAttestation = request.body.json();
  console.log(`Attestation: ${attestation}`);
  const validateResult = validateAttestation(attestation);
  if (!validateResult.result) {
    return {
      statusCode: validateResult.statusCode,
      body: {
        error: {
          message: validateResult.errorMessage,
        },
      },
    };
  }

  // Be sure to request item and the receipt
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
  const receipt = hpkeKeysMap.receipt(kid);

  if (validateResult.statusCode === 202) {
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
    console.log(`Receipt: ${receipt}`);
  } else {
    return {
      statusCode: 202,
      headers: {
        "retry-after": 3,
      },
    };
  }

  // Get wrapping key
  try {
    const [wrapId, wrapKid] = wrapKeyIdMap.latestItem();
    const wrapKey = wrapKeysMap.store.get(wrapKid) as IWrapKey;
    let ret: IWrapped | IWrappedJwt;
    if (fmt == "tink") {
      ret = KeyWrapper.wrapKey(wrapId, wrapKey, keyItem);
    } else {
      // Default is JWT.
      ret = KeyWrapper.wrapKeyJwt(wrapId, wrapKey, keyItem);
    }

    console.log(`key returns (${id}): `, ret);
    return { body: ret };
  } catch (exception: any) {
    const message = `Error Key (${id}): ${exception.message}`;
    console.error(message);
    return {
      statusCode: 500,
      body: {
        error: {
          message,
        },
        inner: exception,
        stack: exception.stack,
      },
    };
  }
};

interface IUnwrapRequest {
  wrapped: string;
  kid: string;
  attestation: ISnpAttestation;
}

// Unwrap private key
export const unwrapKey = (request: ccfapp.Request<IUnwrapRequest>) => {
  // check payload
  const body = request.body.json();
  console.log(`unwrapKey=> wrapped:`, body);
  const attestation: ISnpAttestation = body["attestation"];
  console.log(`unwrapKey=> attestation:`, attestation);
  const wrapped: string = body["wrapped"];
  console.log(`unwrapKey=> wrapped:`, wrapped);
  const wrapKid: string = body["kid"];
  console.log(`unwrapKey=> wrapKid:`, wrapKid);

  // Validate input
  if (!body || !wrapKid || !attestation) {
    const message = `The body is not a unwrap key request: ${JSON.stringify(
      body,
    )}`;
    console.error(message);
    return {
      statusCode: 400,
      body: {
        error: {
          message,
        },
      },
    };
  }

  const query = queryParams(request);
  let fmt = "jwk";
  if (query && query["fmt"]) {
    fmt = query["fmt"];
    if (!(fmt === "jwk" || fmt === "tink")) {
      return {
        statusCode: 400,
        body: {
          error: {
            message: `Wrong fmt query parameter '${fmt}'. Must be jwt or tink.`,
          },
        },
      };
    }
  }

  let wrapKey: IWrapKey;
  try {
    wrapKey = wrapKeysMap.store.get(wrapKid) as IWrapKey;
    if (!wrapKey) {
      const message = `Unwrapping Key with kid (${wrapKid}) not found`;
      console.error(message);
      return {
        statusCode: 400,
        body: {
          error: {
            message,
          },
        },
      };
    }
  } catch (exception: any) {
    const message = `Error Key (${wrapKid}) not found`;
    console.error(message);
    return {
      statusCode: 400,
      body: {
        error: {
          message,
        },
      },
    };
  }
  // validate attestation
  const validateResult = validateAttestation(attestation);
  if (!validateResult.result) {
    return {
      statusCode: validateResult.statusCode,
      body: {
        error: {
          message: validateResult.errorMessage,
        },
      },
    };
  }

  // Get UnWrapping key
  try {
    let unwrapped: Uint8Array | string;

    if (fmt == "tink") {
      unwrapped = KeyWrapper.unwrapKey(wrapKey, body.wrapped);
    } else {
      // Default is JWT.
      unwrapped = KeyWrapper.unwrapKeyJwt(wrapKey, body.wrapped);
    }
    console.log(`key returns (${wrapKid}): ${unwrapped}`);
    return { body: unwrapped };
  } catch (exception: any) {
    const message = `Error unwrap (${wrapKid}): ${exception.message}`;
    console.error(message);
    return {
      statusCode: 500,
      body: {
        error: {
          message,
          exception,
        },
        inner: exception,
      },
    };
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
      console.log(`Receipt: ${receipt}`);
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

// Generate new key pair and store it on the store
export const refresh = () => {
  try {
    // Get HPKE key pair id
    const id = hpkeKeyIdMap.size + 1;

    // Generate HPKE key pair with a six digit id
    const keyItem = KeyGeneration.generateKeyItem(100000 + id);

    // Store HPKE key pair kid
    keyItem.kid = `${keyItem.kid!}_${id}`;
    hpkeKeyIdMap.storeItem(id, keyItem.kid);

    // Store HPKE key pair
    hpkeKeysMap.storeItem(keyItem.kid, keyItem, keyItem.d);
    console.log(`Key item with id ${id} and kid ${keyItem.kid} stored`);

    // Generate Wrapping key pair
    const wrappingKey = KeyWrapper.generateKey();

    // Store wrap key pair kid
    const wrapId = wrapKeyIdMap.size + 1;
    wrapKeyIdMap.storeItem(wrapId, wrappingKey.kid);

    // Store wrap key pair
    wrapKeysMap.storeItem(wrappingKey.kid, wrappingKey, wrappingKey.publicKey);
    console.log(`Wrap Key with id ${wrapId} and kid ${keyItem.kid} stored`);

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
//#endregion

//#region KMS Policies
export const key_release_policy = () => {
  const result = getKeyReleasePolicy();
  const ret = result;
  console.log(`key_release_policy returns: ${JSON.stringify(ret)}`);
  return { body: ret };
};
//#endregion
