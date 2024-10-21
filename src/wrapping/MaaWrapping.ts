// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf, JsonWebKeyRSAPublic } from "@microsoft/ccf-app/global";
import * as ccfcrypto from "@microsoft/ccf-app/crypto";
import * as ccfapp from "@microsoft/ccf-app";
import { IKeyItem } from "../inference/IKeyItem";
import { Base64 } from "js-base64";
import { Logger, LogContext } from "../utils/Logger";
import { arrayBufferToHex, aToHex } from "../utils/Tooling";

export interface MaaWrappedKey {
  kid: string;
  wrappedKey: string;
}

export class MaaWrapping {
  private logContext: LogContext;

  constructor(
    public keyItem: IKeyItem,
    public pubKey: JsonWebKeyRSAPublic,
    logContext?: LogContext,
  ) {
    this.logContext = (logContext?.clone() || new LogContext()).appendScope("MaaWrapping");
  }

  public wrapKey(encrypted: boolean): MaaWrappedKey {
    const pubRsa = ccfcrypto.pubRsaJwkToPem(this.pubKey);
    const pubRsaBuf = ccf.strToBuf(pubRsa);
    const privKeyBuf = this.cborFormat();
    if (encrypted) {
      const algo = {
        name: "RSA-OAEP",
      } as ccfcrypto.RsaOaepParams;
      const wrappedKey = ccfcrypto.wrapKey(privKeyBuf, pubRsaBuf, algo);

      return {
        kid: this.pubKey.kid!,
        wrappedKey: Base64.fromUint8Array(new Uint8Array(wrappedKey)),
      };
    }
    return {
      kid: this.pubKey.kid!,
      wrappedKey: arrayBufferToHex(privKeyBuf),
    };
  }

  public cborFormat(): ArrayBuffer {
    const header: Uint8Array = new Uint8Array([0xa5]);
    //const kty: Uint8Array = new Uint8Array([0x01, 0x02]);
    //const crv: Uint8Array = new Uint8Array([0x03, 0x02]);
    const xType: Uint8Array = new Uint8Array([0x21, 0x58, 0x30]);
    const x: Uint8Array = Base64.toUint8Array(this.keyItem.x);
    const yType: Uint8Array = new Uint8Array([0x22, 0x58, 0x30]);
    const y: Uint8Array = Base64.toUint8Array(this.keyItem.y);
    const dType: Uint8Array = new Uint8Array([0x23, 0x58, 0x30]);
    const d: Uint8Array = Base64.toUint8Array(this.keyItem.d!);
    const kid: Uint8Array = new Uint8Array([
      0x20,
      0x02,
      0x04,
      this.keyItem.id! % 256,
    ]);

    //const cbor = this.concatUint8ArraysToArrayBuffer([header, kty, crv, xType, x, yType, y, dType, d, kid]);
    const cbor = this.concatUint8ArraysToArrayBuffer([
      header,
      dType,
      d,
      xType,
      x,
      yType,
      y,
      kid,
    ]);
    // secret
    Logger.info(`CBOR format: ${aToHex(cbor)}`, this.logContext);
    return cbor.buffer;
  }

  public static getWrappingKey(
    jwtIdentity: ccfapp.JwtAuthnIdentity,
  ): JsonWebKeyRSAPublic {
    if (!jwtIdentity) {
      throw new Error("Authentication Policy is not set");
    }

    if (jwtIdentity.policy !== "jwt") {
      throw new Error("Authentication Policy must be jwt");
    }

    if (!jwtIdentity.jwt) {
      throw new Error("Authentication Policy jwt is not set");
    }

    if (!jwtIdentity.jwt.payload) {
      throw new Error("Authentication Policy jwt payload is not set");
    }

    if (!jwtIdentity.jwt.payload["x-ms-runtime"]) {
      throw new Error("Authentication Policy jwt x-ms-runtime is not set");
    }

    const keys: JsonWebKeyRSAPublic[] =
      jwtIdentity.jwt.payload["x-ms-runtime"]["keys"];
    if (!keys) {
      throw new Error("Authentication Policy jwt keys is not set");
    }
    const pubKey = keys.filter(
      (key: JsonWebKeyRSAPublic) => key.kid === "TpmEphemeralEncryptionKey",
    );
    if (pubKey.length === 0) {
      throw new Error(
        "Authentication Policy does not contain public key TpmEphemeralEncryptionKey",
      );
    }

    return pubKey[0];
  }

  private concatUint8ArraysToArrayBuffer(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
    const concatenatedArray = new Uint8Array(totalLength);

    // Copy each Uint8Array into the new Uint8Array
    let offset = 0;
    for (const array of arrays) {
      concatenatedArray.set(array, offset);
      offset += array.length;
      Logger.info(
        `Concatenated array (${offset}): ${aToHex(concatenatedArray)}`, this.logContext,
      );
    }

    // Step 4: Return the underlying ArrayBuffer
    return concatenatedArray;
  }
}
