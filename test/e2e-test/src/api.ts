// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
//import { ccf } from "@microsoft/ccf-app/global";
import { DemoMemberProps, DemoProps } from "./index";
import axios from "axios";
import { IKeyItem } from "../../../src";
import { IWrapped, IWrappedJwt } from "../../../src/endpoints/KeyWrapper";
import { ISnpAttestation } from "../../../src/attestation/ISnpAttestation";
import https from "https";
import * as http2 from "http2";
import keyutil from "js-crypto-key-utils";
import rsa from "js-crypto-rsa";
import { JsonWebKey } from "node:crypto";
import { Base64 } from "js-base64";
import * as hpke from "../../../src/endpoints/proto/gen/hpke_pb.js";

export interface ValidationProps {
  url: string;
  method: "POST";
  member: DemoMemberProps;
  expectedStatus: number;
  testMessage: string;
}

export const convertUint8ArrayToString = (uInt8array: Uint8Array): string => {
  let stringRepresentation = "";
  for (let i = 0; i < uInt8array.length; i++) {
    stringRepresentation += String.fromCharCode(uInt8array[i]);
  }
  return stringRepresentation;
};
export class Validator {
  public static async validateRequest(props: ValidationProps) {
    const result = await axios({
      method: props.method,
      url: props.url,
      data: props.member.data,
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      },
    });

    if (result.status !== props.expectedStatus) {
      throw new Error(
        `🛑 [TEST FAILURE]: ${props.member.name} - ${props.testMessage}: ${props.expectedStatus} expected, but got ${result.status}.`,
      );
    }

    console.log(`✅ [PASS] ${props.member.name} - ${props.testMessage}`);
  }
}

export default class Api {
  private static responsePromise(
    request: http2.ClientHttp2Stream,
    responseType = "json",
  ) {
    return new Promise((resolve, reject) => {
      let data: string = "";
      let chunks: Buffer[] = [];
      let statusCode = 0;
      request.on("data", (chunk: string | Buffer) => {
        if (responseType === "json") {
          console.log('responsePromise chunk: ', chunk);
          data += chunk;
        } else {
          chunks.push(chunk as Buffer);
        }
      });

      request.on("end", () => {
        if (responseType === "json") {
          resolve({ statusCode, data });
        } else {
          let data = Buffer.concat(chunks);
          resolve({ statusCode, data });
        }
      });

      request.on("response", (headers) => {
        statusCode = headers[":status"] || 0;
      });

      request.on("error", (error) => {
        reject(error);
      });
    });
  }

  public static async hearthbeat(
    props: DemoProps,
    member: DemoMemberProps,
    httpsAgent: https.Agent,
    authorizationHeader?: string,
  ): Promise<[number, object]> {
    console.log(`hearthbeat authorization header: ${authorizationHeader}`);

    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
          ":method": "GET",
          ":path": `${props.hearthbeatPath}`,
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        }
      : {
          ":method": "GET",
          ":path": `${props.hearthbeatPath}`,
          "Content-Type": "application/json",
        };

    const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true,
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);
    req.end();

    let response;
    try {
      response = await Api.responsePromise(req);
      console.log("Status:", response.statusCode);
      console.log("Response data:", response.data);
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }
    return [response.statusCode, JSON.parse(response.data)];
  }

  public static async refresh(
    props: DemoProps,
    member: DemoMemberProps,
    httpsAgent: https.Agent,
    authorizationHeader?: string,
  ): Promise<[number, IKeyItem]> {
    console.log(`Refresh props:`, props);
    console.log(`Refresh https agent:`, httpsAgent);
    console.log(`Refresh authorization header:`, authorizationHeader);
    console.log(`${member.name} Refresh key:`);
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
          ":method": "POST",
          ":path": `${props.refreshPath}`,
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        }
      : {
          ":method": "POST",
          ":path": `${props.refreshPath}`,
          "Content-Type": "application/json",
        };
    const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true,
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);

    req.end();

    let response;
    try {
      response = await Api.responsePromise(req);
      console.log("Status:", response.statusCode);
      console.log("Response data:", response.data);
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }
    return [response.statusCode, JSON.parse(response.data)];
  }

  private static decryptTinkPrivateKey = async (
    encryptedKeyset: string,
    privateWrapKey: string,
  ) => {
    // Get base64 key set value
    const respBuf = Base64.toUint8Array(encryptedKeyset);
    const privateKey = new keyutil.Key("pem", privateWrapKey);
    const unwrappedKey = await rsa.decrypt(
      respBuf,
      (await privateKey.jwk) as JsonWebKey,
    );
    return unwrappedKey;
  };

  private static decryptTinkKey = async (
    wrapped: IWrapped,
    privateWrapKey: string,
  ) => {
    const keyMaterial = JSON.parse(wrapped.keys[0].keyData[0].keyMaterial);
    console.log(`keyMaterial: `, keyMaterial);
    // Get base64 key set value
    const encryptedKeyset = keyMaterial.encryptedKeyset;

    const unwrappedKey = await this.decryptTinkPrivateKey(
      encryptedKeyset,
      privateWrapKey,
    );
    keyMaterial.encryptedKeyset = Base64.fromUint8Array(unwrappedKey);
    console.log(`unwrapped tink key: `, keyMaterial.encryptedKeyset);
    wrapped.keys[0].keyData[0].keyMaterial = JSON.stringify(keyMaterial);
    return wrapped;
  };

  public static async key(
    props: DemoProps,
    member: DemoMemberProps,
    attestation: ISnpAttestation,
    privateWrapKey: string,
    publicWrapKey: string,
    tink: boolean,
    httpsAgent: https.Agent,
    authorizationHeader?: string,
  ): Promise<
    [
      number,
      (
        | IWrapped
        | { receipt: string; wrappedKid: string; wrapped: string }
        | undefined
      ),
    ]
  > {
    console.log(
      `${member.name} Get wrapped private key with receipt. tink: ${tink}:`,
      authorizationHeader,
    );
    const query = tink ? "?fmt=tink" : "";
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
          ":method": "POST",
          ":path": `${props.keyPath}${query}`,
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        }
      : {
          ":method": "POST",
          ":path": `${props.keyPath}${query}`,
          "Content-Type": "application/json",
        };
    const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true,
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);
    req.write(JSON.stringify({ attestation, wrappingKey: publicWrapKey }));
    req.end();

    let response;
    try {
      response = await Api.responsePromise(req);
      console.log("Status:", response.statusCode);
      if (response.statusCode > 200) {
        console.log(
          `Directly return statuscode with response: `,
          response.data,
        );
        return [
          response.statusCode,
          response.data ? JSON.parse(response.data) : undefined,
        ];
      }
      console.log("Response data:", response.data);
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }

    if (tink) {
      const resp = JSON.parse(response.data);
      const receipt = resp.receipt;
      console.log(`Receipt: `, resp.receipt);
      console.log(`key id: `, resp.wrappedKid);
      console.log(`wrapped: `, resp.wrapped);

      return [response.statusCode, resp];
    } else {
      const resp = JSON.parse(response.data);
      console.log(`key returned: `, response.data);
      const receipt = resp.receipt;
      console.log(`Key id: `, resp.wrappedKid);
      console.log(`Receipt: `, resp.receipt);

      return [
        response.statusCode,
        {
          receipt,
          wrapped: resp.wrapped,
          wrappedKid: resp.wrappedKid,
        },
      ];
    }
  }

  public static async unwrap(
    props: DemoProps,
    member: DemoMemberProps,
    wrappedKid: string,
    attestation: ISnpAttestation,
    privateWrapKey: string,
    publicWrapKey: string,
    tink: boolean,
    httpsAgent: https.Agent,
    authorizationHeader?: string,
  ): Promise<[number, string | IKeyItem | { [key: string]: any }]> {
    console.log(
      `${member.name} Get unwrapped private key with receipt, think: ${tink}`,
    );
    const query = tink ? "?fmt=tink" : "";
    const responseType = tink ? "arraybuffer" : "json";
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
          ":method": "POST",
          ":path": `${props.unwrapPath}${query}`,
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        }
      : {
          ":method": "POST",
          ":path": `${props.unwrapPath}${query}`,
          "Content-Type": "application/json",
        };
    const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true,
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);
    req.write(
      JSON.stringify({ wrappedKid, attestation, wrappingKey: publicWrapKey }),
    ); // Send the request body
    req.end();

    let wrappedKey: Uint8Array;
    let response;
    try {
      response = await Api.responsePromise(req, responseType);
      console.log("Status:", response.statusCode);
      console.log(`Response--> `, response);
      if (response.statusCode > 200) {
        console.log(
          `Directly return statuscode with response: `,
          response.data,
        );
        return [
          response.statusCode,
          response.data ? JSON.parse(response.data) : undefined,
        ];
      }
    } catch (error) {
      console.error("Error:", error.message);
      throw new Error(error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }
    if (tink) {
      const resp = JSON.parse(response.data);
      const receipt = resp.receipt;
      console.log(`Wrapped key: `, resp.wrapped);
      console.log(`Receipt: `, resp.receipt);
      resp.wrapped = Base64.fromUint8Array(
        await this.decryptTinkPrivateKey(resp.wrapped, privateWrapKey),
      );
      let tinkHpkeKey = new hpke.HpkePrivateKey();
      const jsonKey = tinkHpkeKey.toJsonString(resp.wrapped);
      console.log(`unwrap tink result (${jsonKey.length}): `, jsonKey);
      return [response.statusCode, resp];
    } else {
      const resp = JSON.parse(response.data);
      console.log(`unwrapKey returned: `, response.data);
      const receipt = resp.receipt;
      console.log(`Wrapped key: `, resp.wrapped);
      console.log(`Receipt: `, resp.receipt);
      const respBuf = Base64.toUint8Array(resp.wrapped);
      const privateKey = new keyutil.Key("pem", privateWrapKey);
      const wrappedKey = await rsa.decrypt(
        respBuf,
        (await privateKey.jwk) as JsonWebKey,
      );
      let unwrappedKey = convertUint8ArrayToString(wrappedKey);
      console.log(`Unwrapped key decrypted: `, unwrappedKey);

      return [response.statusCode, { key: JSON.parse(unwrappedKey), receipt }];
    }
  }
}
