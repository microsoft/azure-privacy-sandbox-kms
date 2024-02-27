// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DemoMemberProps, DemoProps } from "./index";
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { IKeyItem } from "../../../src";
import { IWrapped, IWrappedJwt } from "../../../src/endpoints/KeyWrapper";
import { ISnpAttestation } from "../../../src/attestation/ISnpAttestation";
import https from "https";
import * as http2 from "http2";

export interface ValidationProps {
  url: string;
  method: "POST";
  member: DemoMemberProps;
  expectedStatus: number;
  testMessage: string;
}

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
  private static responsePromise(request: http2.ClientHttp2Stream, responseType = "json") {
    return new Promise((resolve, reject) => {
      let data: string  = '';
      let chunks: Buffer[] = [];
      let statusCode = 0;
      request.on('data', (chunk: string | Buffer) => {
        if (responseType === "json") {
          data += chunk;
        } else {
          chunks.push(chunk as Buffer)
        }        
      });

      request.on('end', () => {
        if (responseType === "json") {
          resolve({ statusCode, data });
        } else {
          let data = Buffer.concat(chunks);          
          resolve({ statusCode, data });
        }
      });

      request.on('response', (headers) => {
        statusCode = headers[':status'] || 0;
      });

      request.on('error', (error) => {
        reject(error);
      });
    });
  }


  public static async hearthbeat(
    props: DemoProps,
    member: DemoMemberProps,
    httpsAgent: https.Agent,
    authorizationHeader?: string,
  ): Promise<IKeyItem> {
    console.log(`📝 hearthbeat authorization header: ${authorizationHeader}`);
    
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
        ":method": "GET",
        ":path": `${props.hearthbeatPath}`,
        "Content-Type": "application/json",
        "Authorization": authorizationHeader
      }
      : {
        ":method": "GET",
        ":path": `${props.hearthbeatPath}`,
        "Content-Type": "application/json",
      };
      
      const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);
    req.end();
    
    let response;
    try {
      response = await Api.responsePromise(req);
      console.log('Status:', response.statusCode);
      console.log('Response data:', response.data);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }

    if (!response || response.statusCode !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${response.statusCode}`,
      );
    }

    console.log(
      `✅ [PASS] [${response.statusCode} : ${member.name}`,
    );
    return JSON.parse(response.data);
  }

  public static async refresh(
    props: DemoProps,
    member: DemoMemberProps,
    httpsAgent: https.Agent,
    authorizationHeader?: string,
  ): Promise<IKeyItem> {
    console.log(`📝 Refresh props:`, props);
    console.log(`📝 Refresh https agent:`, httpsAgent);
    console.log(`📝 Refresh authorization header:`, authorizationHeader);
    console.log(`📝 ${member.name} Refresh key:`);
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
        ":method": "POST",
        ":path": `${props.refreshPath}`,
        "Content-Type": "application/json",
        "Authorization": authorizationHeader
      }
      : {
        ":method": "POST",
        ":path": `${props.refreshPath}`,
        "Content-Type": "application/json",
      };
    const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);

    req.end();

    let response;
    try {
      response = await Api.responsePromise(req);
      console.log('Status:', response.statusCode);
      console.log('Response data:', response.data);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }

    if (response.statusCode !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${response.statusCode}`,
      );
    }

    console.log(
      `✅ [PASS] [${response.statusCode} : ${member.name}`,
    );
    return JSON.parse(response.data);
  }

  public static async keyInitial(
    props: DemoProps,
    member: DemoMemberProps,
    data: string,
    httpsAgent: https.Agent,
    authorizationHeader?: string
  ): Promise<IKeyItem | undefined> {
    console.log(`📝 ${member.name} Get initial wrapped private key:`, authorizationHeader);
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
      ? {
        ":method": "POST",
        ":path": `${props.keyPath}`,
        "Content-Type": "application/json",
        "Authorization": authorizationHeader
      }
      : {
        ":method": "POST",
        ":path": `${props.keyPath}`,
        "Content-Type": "application/json",
      };
    const client = http2.connect(props.url, {
      ...httpsAgent.options,
      rejectUnauthorized: true
    } as http2.SecureClientSessionOptions);
    const req = client.request(reqProps);
    req.write(data); // Send the request body
    req.end();

    let response;
    try {
      response = await Api.responsePromise(req);
      console.log('Status:', response.statusCode);
      console.log('Response data:', response.data);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      // Close the client session when done
      if (client) {
        client.close();
      }
    }

    if (response.statusCode !== 202) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${response.statusCode}}`,
      );
    }

    console.log(
      `✅ [PASS] [${response.statusCode} :  ${member.name}`, response.data);

    if (response.data) {
      return JSON.parse(response.data);  
    }
    return undefined;
  }

  public static async key(
    props: DemoProps,
    member: DemoMemberProps,
    data: string,
    tink: boolean,
    httpsAgent: https.Agent,
    authorizationHeader?: string
  ): Promise<IWrapped | IWrappedJwt> {
    console.log(`📝 ${member.name} Get wrapped private key with receipt:`, authorizationHeader);
    const query = tink ? "?fmt=tink" : "";
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
    ? {
      ":method": "POST",
      ":path": `${props.keyPath}${query}`,
      "Content-Type": "application/json",
      "Authorization": authorizationHeader
    }
    : {
      ":method": "POST",
      ":path": `${props.keyPath}${query}`,
      "Content-Type": "application/json",
    };
  const client = http2.connect(props.url, {
    ...httpsAgent.options,
    rejectUnauthorized: true
  } as http2.SecureClientSessionOptions);
  const req = client.request(reqProps);
  req.write(data); // Send the request body
  req.end();

  let response;
  try {
    response = await Api.responsePromise(req);
    console.log('Status:', response.statusCode);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close the client session when done
    if (client) {
      client.close();
    }
  }

    if (response.statusCode !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${response.statusCode}`,
      );
    }

    console.log(
      `✅ [PASS] [${response.statusCode} : ${member.name}`,
    );

    return JSON.parse(response.data);
  }

  public static async unwrap(
    props: DemoProps,
    member: DemoMemberProps,
    wrapped: string,
    kid: string,
    attestation: ISnpAttestation,
    tink: boolean,
    httpsAgent: https.Agent,
    authorizationHeader?: string
  ): Promise<Uint8Array | IKeyItem> {
    console.log(`📝 ${member.name} Get unwrapped private key with receipt, think: ${tink}:`);
    const query = tink ? "?fmt=tink" : "";
    const responseType = tink ? "arraybuffer" : "json";
    const reqProps: http2.OutgoingHttpHeaders = authorizationHeader
    ? {
      ":method": "POST",
      ":path": `${props.unwrapPath}${query}`,
      "Content-Type": "application/json",
      "Authorization": authorizationHeader
    }
    : {
      ":method": "POST",
      ":path": `${props.unwrapPath}${query}`,
      "Content-Type": "application/json",
    };
  const client = http2.connect(props.url, {
    ...httpsAgent.options,
    rejectUnauthorized: true
  } as http2.SecureClientSessionOptions);
  const req = client.request(reqProps);
  req.write(JSON.stringify({ wrapped, kid, attestation })); // Send the request body
  req.end();

  let response;
  try {
    response = await Api.responsePromise(req, responseType);
    console.log('Status:', response.statusCode);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close the client session when done
    if (client) {
      client.close();
    }
  }

    if (response.statusCode !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${response.statusCode}`,
      );
    }

    console.log(
      `✅ [PASS] [${response.statusCode} : ${member.name}`,
    );
    if (tink) {
      const res = new Uint8Array(response.data);
      console.log(res);
      return res;
    } else {
      return JSON.parse(response.data);
    }
  }
}
