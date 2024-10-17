// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Base64 } from "js-base64";
import { IKeyItem } from "./IKeyItem";
import { aToHex } from "../utils/Tooling";
import { Logger } from "../utils/Logger";

/*
    * This class is responsible for creating the public key
    * in the OHTTP format.
    * Example:
    * 002d0000209f7ee31cfc658c9c98d15707b7ff450854d1faa9edca1fd088b2900c5406710500080001000100010003
    * 002d - key length, 45 bytes is key configuration
    * KeyID: 00
    * HPKE KEM ID: 0020 (X25519Sha256)
    * Public key: 9f….105 (32 bytes)
    * HPKE algorithms length: 0008 (2 x 4)
    * HPKE KDF ID: 0001 (HkdfSha256)
    * HPKE AEAD ID: 0001 (Aes128Gcm)
    * HPKE KDF ID: 0001 (HkdfSha256)
    * HPKE AEAD ID: 0003 (ChaCha20Poly1305)

    */

export class OhttpPublicKey {
  private messageCount = 0;

  constructor(public keyItem: IKeyItem) {
    Logger.info(`${OhttpPublicKey.name}: Public key generation for key id: ${this.keyItem.id}`);
    Logger.debug(`${OhttpPublicKey.name}: KeyItem: `, keyItem);
  }

  public get(): string {
    if (this.keyItem.crv !== "P-384") {
      throw new Error(`${OhttpPublicKey.name}: Curve: ${this.keyItem.crv} not supported`);
    }

    this.messageCount = 0;
    const publicKey =
      this.keyId() +
      this.hpkeKemId() +
      this.publicKey() +
      this.hpkeAlgorithmsLength() +
      this.hpkeSymmetricAlgorithms();
    Logger.debug(`${OhttpPublicKey.name}: Public key length: ${this.keyLength()}`);
    return publicKey;
  }

  private keyLength(): string {
    return this.messageCount.toString(16).padStart(4, "0");
  }

  private keyId(): string {
    this.messageCount += 1;
    return this.keyItem.id!.toString(16).padStart(2, "0");
  }

  // HPKE KEM ID
  private hpkeKemId(): string {
    this.messageCount += 2;
    return "0011";
  }

  // Public key
  private publicKey(): string {
    const x = Base64.toUint8Array(this.keyItem.x);
    const xHex = aToHex(x.buffer);
    Logger.info(`${OhttpPublicKey.name}: Public key X: ${xHex}`);
    const y = Base64.toUint8Array(this.keyItem.y);
    const yHex = aToHex(y.buffer);
    Logger.info(`${OhttpPublicKey.name}: Public key Y: ${yHex}`);
    const publicKey = "04" + xHex + yHex;
    this.messageCount += publicKey.length / 2;
    return publicKey;
  }

  // HPKE algorithms length
  private hpkeAlgorithmsLength(): string {
    this.messageCount += 2;
    return "0004";
  }

  // HPKE Symmetric Algorithms
  private hpkeSymmetricAlgorithms(): string {
    this.messageCount += 4;
    return "00020002";
  }
}
