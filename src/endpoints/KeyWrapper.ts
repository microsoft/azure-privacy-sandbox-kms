// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfcrypto from "@microsoft/ccf-app/crypto";
import { ccf } from "@microsoft/ccf-app/global";
import { KeyGeneration } from "./KeyGeneration";
import { Base64 } from "js-base64";
import { IKeyItem, IWrapKey } from "./IKeyItem";
import * as tink from "./proto/gen/tink_pb";
import * as hpke from "./proto/gen/hpke_pb";

// Used by tink_pb and hpke_pb
export class TextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(ccf.strToBuf(input));
  }

  encodeInto(input: string, output: Uint8Array) {
    throw new Error("Not implemented");
  }
}

if (globalThis != undefined && (globalThis as any).TextEncoder == undefined) {
  (globalThis as any).TextEncoder = TextEncoder;
}

/*
example json keyset / keyMaterial from tink repo:
{
  "encryptedKeyset": "your_enc_keyset_base64_value",
  "keysetInfo": {
    "primaryKeyId": 42,
    "keyInfo": [
      {
        "typeUrl": "type.googleapis.com/google.crypto.tink.AesGcmKey",
        "outputPrefixType": "TINK",
        "keyId": 42,
        "status": "ENABLED"
      }
    ]
  }
}
example from B&A's test:
{
    "keysetInfo": {
        "primaryKeyId": 1353288376,
        "keyInfo": [{
            "typeUrl": "type.googleapis.com/google.crypto.tink.EciesAeadHkdfPrivateKey",
            "outputPrefixType": "TINK",
            "keyId": 1353288376,
            "status": "ENABLED"
        }]
    },
    "encryptedKeyset": "AOeDD+K9avWgJPATpSkvxEVqMKG1QpWzpSgOWdaY3H8CdTuEjcRWSTwtUKNIzY62C5g4sdHiFRYbHAErW8fZB0rlAfZx6Al43G/exlWzk8CZcrqEX0r/VTFsTNdGb6zmTFqLGqmV54yqsryTazF92qILsPyNuFMxm4AfZ4hUDXmHSYZPOr9FUbYkfYeQQebeUL5GKV8dSInj4l9/xnAdyG92iVqhG5V7KxsymVAVnaj8bP7JPyM2xF1VEt8YtQemibrnBHhOtkZEzUdz88O1A4qHVYW1bb/6tCtfI4dxJrydYB3fTsdjOFYpTvhoFbQTVbSkF5IPbH8acu0Zr4UWpFKDDAlg5SMgVcsxjteBouO0zum7opp2ymN1pFllNuhIDTg0X7pp5AU+8p2wGrSVrkMEFVgWmifL+dFae6KQRvpFd9sCEz4pw7Kx6uqcVsREE8P2JgxLPctMMh021LGVE25+4fjC1vslYlCRCUziZPN8W3BP9xvORxj0y9IvChBmqBcKjT56M+5C26HXWK2U26ZR7OxLIdesLQ\u003d\u003d"
}
about the typeURL from javadoc:
https://google.github.io/tink/javadoc/tink/1.3.0/com/google/crypto/tink/proto/EciesAeadHkdfPrivateKey.html
from tink-cc:
https://github.com/tink-crypto/tink-cc/blob/abebc3ac2281846a6f455e48d74cdff935d2f4bd/proto/ecies_aead_hkdf.proto#L98C1-L98C1
*/
const WRAPKEYSIZE = 4096;
const WRAPALGONAME = "RSA-OAEP";

export type IKeyDataElement = {
  publicKeySignature: string;
  keyEncryptionKeyUri: string;
  keyMaterial: string; // Based on the code it should be compatible with tink library, and should be able to be handled by JsonKeysetReader::New(). Json Keyset.
};

export type IKeyData = IKeyDataElement[];

// Based on https://github.com/privacysandbox/data-plane-shared-libraries/blob/042c6f93558638376ac3f6ab479aed7f0342da67/scp/cc/cpio/client_providers/interface/private_key_fetcher_provider_interface.h#L86
export type EncryptionKey = {
  name: string;
  encryptionKeyType: string;
  publicKeysetHandle: string;
  publicKeyMaterial: string;
  creationTime: string;
  expirationTime: string;
  keyData: IKeyData;
};

export type IWrapped = {
  keys: EncryptionKey[];
};

export type IWrappedJwt = string;

export const WrapAlgorithms: string[] = [WRAPALGONAME];

// keyEncryptionKeyUri should be in the format of `<10-character length prefix><cloud-specific contents to specify wrapping key>`.
// https://github.com/privacysandbox/data-plane-shared-libraries/blob/042c6f93558638376ac3f6ab479aed7f0342da67/scp/cc/cpio/client_providers/private_key_client_provider/src/private_key_client_utils.cc#L113
// This variable defines the prefix.
// It's "gcp-kms://" for GCP and "aws-kms://" for AWS.
const keyEncryptionKeyUriPrefix = "azu-kms://";

export class KeyWrapper {
  private static WRAPALGO = {
    name: WRAPALGONAME,
  } as ccfcrypto.RsaOaepParams;

  // Generate the wrapping key
  public static generateKey = (): IWrapKey => {
    const keyPair: IWrapKey = ccfcrypto.generateRsaKeyPair(WRAPKEYSIZE);
    keyPair.kid = KeyGeneration.calculateKid(keyPair.publicKey);
    console.log(`Wrap public key: `, keyPair.publicKey);
    return keyPair;
  };

  // Create an encrypted private tink keyset. Return the Base64 encoded result of the wrapped key.
  public static createWrappedPrivateTinkKey = (
    wrappingKey: ArrayBuffer | undefined,
    payload: IKeyItem,
  ): string => {
    let tinkHpkeKey = new hpke.HpkePrivateKey();
    tinkHpkeKey.privateKey = Base64.toUint8Array(payload.d);
    // TODO: check if we need to set tinkHpkeKey.publicKey. Based on tink.proto, it's optional though.
    // From the tink code, you can see currently version=0 is the only option
    tinkHpkeKey.version = 0;
    let keyset = new tink.Keyset();
    // TODO: Check if it is okey as a tink key ID
    // primaryKeyId should match with key[0].keyId when size(key) is 1.
    const keyId = 0;
    keyset.primaryKeyId = keyId;
    keyset.key = [new tink.Keyset_Key()];
    keyset.key[0].keyId = keyId;
    keyset.key[0].status = tink.KeyStatusType.ENABLED;
    keyset.key[0].outputPrefixType = tink.OutputPrefixType.TINK;

    let keyData = new tink.KeyData();
    keyData.keyMaterialType = tink.KeyData_KeyMaterialType.ASYMMETRIC_PRIVATE;
    keyData.typeUrl = "type.googleapis.com/google.crypto.tink.HpkePrivateKey";
    keyData.value = tinkHpkeKey.toBinary();
    keyset.key[0].keyData = keyData;
    console.log(`tink Keyset: `, keyData);

    let bufPayload = keyset.toBinary().buffer;

    console.log(
      `Tink Wrapped payload (${JSON.stringify(keyset).length}): `,
      keyset,
    );

    let wrappedB64: string;
    if (wrappingKey) {
      const algo = KeyWrapper.WRAPALGO;
      const wrapped = ccfcrypto.wrapKey(bufPayload, wrappingKey, algo);

      wrappedB64 = Base64.fromUint8Array(new Uint8Array(wrapped));
    } else {
      // Create a dummy private key
      wrappedB64 = Base64.fromUint8Array(
        new Uint8Array(new ArrayBuffer(bufPayload.byteLength)),
      );
    }
    return wrappedB64;
  };

  // Create an EncryptionKey structure of a tink key
  public static wrapKeyTink = (
    wrappingKey: ArrayBuffer | undefined,
    payload: IKeyItem,
  ): IWrapped => {
    const encryptionKey: EncryptionKey = {
      // The following id will be treated as keyId.
      // We need to figure out the exact format.
      // - It will be treated as google::cmrt::sdk::private_key_service::v1::PrivateKey::key_id()
      // - At least this value should be compatible with ToOhttpKeyId()
      //   https://github.com/privacysandbox/data-plane-shared-libraries/blob/042c6f93558638376ac3f6ab479aed7f0342da67/src/cpp/encryption/key_fetcher/src/private_key_fetcher.cc#L134
      // - ToOhttpKeyId(keyId) will be treated as PrivateKey.key_id
      //   https://github.com/privacysandbox/data-plane-shared-libraries/blob/042c6f93558638376ac3f6ab479aed7f0342da67/src/cpp/encryption/key_fetcher/interface/private_key_fetcher_interface.h#L38
      //   For this example, the value is 18. Sometimes PrivateKey.key_id is called "OHTTP ID" (https://github.com/privacysandbox/data-plane-shared-libraries/blob/042c6f93558638376ac3f6ab479aed7f0342da67/src/cpp/encryption/key_fetcher/src/private_key_fetcher.cc#L142).
      name: `encryptionKeys/${payload.id}`,
      encryptionKeyType: "SINGLE_PARTY_HYBRID_KEY", // Should be correct
      publicKeysetHandle: `TBD`, // Haven't found any usage
      publicKeyMaterial: "testtest", // Haven't found any usage
      creationTime: `${Date.now()}`, // These value needs to be reasonable, otherwise B&A will delete keys from its cache. https://github.com/privacysandbox/data-plane-shared-libraries/blob/042c6f93558638376ac3f6ab479aed7f0342da67/src/cpp/encryption/key_fetcher/src/private_key_fetcher.cc#L168
      expirationTime: `${Date.now() + 365 * 24 * 60 * 60 * 1000}`, // Add one year for now, needs to be fixed by policy TODO
      keyData: [
        {
          publicKeySignature: "",
          keyEncryptionKeyUri: keyEncryptionKeyUriPrefix + payload.kid,
          keyMaterial: JSON.stringify({
            encryptedKeyset: this.createWrappedPrivateTinkKey(
              wrappingKey,
              payload,
            ), // This should be base64 encoded encrypted proto bytes of tink.
            // // keysetInfo is optional in tink https://github.com/tink-crypto/tink-java/blob/main/proto/tink.proto#L193,
            // // but we are not sure if we can omit it actually.
            // keysetInfo: {
            //   primaryKeyId: 42,
            //   keyInfo: [
            //     {
            //       typeUrl: 'mytype',
            //       outputPrefixType: 'TINK',
            //       keyId: 42,
            //       status: 'ENABLED',
            //     },
            //   ],
            // },
          }),
        },
      ],
    };
    console.log(`Encryption public key: `, encryptionKey);
    const ret: IWrapped = { keys: [encryptionKey] };
    return ret;
  };

  // Get key material
  private static getEncryptedKeyMaterial(
    wrappingKey: ArrayBuffer | undefined,
    payload: IKeyItem,
  ): [string, string] {
    console.log(`getEncryptedKeyMaterial: `, payload);
    const receipt = payload.receipt;
    delete payload.receipt;

    const unwrappedJwtKey = JSON.stringify(payload);
    if (wrappingKey) {
      const wrapped = Base64.fromUint8Array(
        new Uint8Array(
          ccf.crypto.wrapKey(
            ccf.strToBuf(unwrappedJwtKey),
            wrappingKey,
            KeyWrapper.WRAPALGO,
          ),
        ),
      );

      return [wrapped, receipt];
    } else {
      return ["", receipt];
    }
  }

  // Wrap the JWT payload with the public key provided by client.
  public static wrapKeyJwt = (
    wrappingKey: ArrayBuffer,
    payload: IKeyItem,
  ): IWrappedJwt => {
    const [wrappedKey, _] = this.getEncryptedKeyMaterial(wrappingKey, payload);
    return wrappedKey;
  };
}
