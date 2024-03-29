// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Api, { Validator } from "./api.js";
import path from "path";
import {
  member0DataPart1,
  member0DataPart2,
  member1Data,
  member2Data,
} from "./data.js";
import { exec } from "child_process";
import https from "https";
import fs, { stat } from "fs";
import inquirer from "inquirer";
import { IKeyItem } from "../../../src";
import * as tink from "../../../src/endpoints/proto/gen/tink_pb.js";
import * as hpke from "../../../src/endpoints/proto/gen/hpke_pb.js";
import { IWrapped, IWrappedJwt } from "../../../src/endpoints/KeyWrapper.js";

const readJSON = async (filePath: string): Promise<any> => {
  try {
    const fileContents = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContents);
  } catch (error) {
    throw new Error(`Error reading JSON file: ${error.message}`);
  }
};

const serverUrl = process.env.SERVER!;
const certificateStorePath = process.env.CERTS_FOLDER!;
const interactiveMode = process.env.INTERACTIVE_MODE!;

export interface DemoProps {
  url: string;
  refreshPath: string;
  proposalPath: string;
  keyPath: string;
  unwrapPath: string;
  hearthbeatPath: string;
}

export interface DemoMemberProps {
  id: string;
  name: string;
  data: unknown;
}

export enum AuthKinds {
  NoAuth = 0,
  JWT,
  UserCerts,
  MemberCerts,
}

class Demo {
  //
  private static readonly demoProps: DemoProps = {
    url: `${serverUrl}`,
    refreshPath: `/app/refresh`,
    proposalPath: `/gov/proposals`,
    keyPath: `/app/key`,
    unwrapPath: `/app/unwrapKey`,
    hearthbeatPath: `/app/hearthbeat`,
  };

  private static memberDataMap = new Map([
    ["0", member0DataPart1],
    ["1", member1Data],
    ["2", member2Data],
  ]);
  private static memberIds = ["0", "1", "2"];

  private static readonly members = Array<DemoMemberProps>();

  private static executeCommand = async (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  private static sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  public static async start() {
    /**
     * Change working directory to the root of the project
     * All paths and process execution will be relative to root
     */
    const originalDirectory = path.resolve();
    console.log(`Original directory: ${originalDirectory}`);
    const attestation = await readJSON("test/attestation-samples/snp.json");

    this.printTestSectionHeader(
      `🏁 Starting e2e Tests on server ${serverUrl} for kms`,
    );

    for (const memberId of this.memberIds) {
      const member = this.createMember(memberId);
      this.members.push(member);
    }

    this.printTestSectionHeader("🔬 [TEST]: Setup kms");
    const output = await Demo.executeCommand(`make setup >/tmp/make.txt`);

    this.printTestSectionHeader("🔬 [TEST]: generate access token");
    const access_token = await Demo.executeCommand(
      `./scripts/authorization_header.sh`,
    );
    console.log(`Authorization header: ${access_token}`);

    process.chdir("../../");

    this.printTestSectionHeader("🔬 [TEST]: Key generation Service");

    const notUndefinedString = (key: string | number | any[]) => {
      return key !== undefined;
    };

    const notUndefinedArray = (key: string | number | any[]) => {
      return key !== undefined;
    };

    const undefinedString = (key: string | number | any[]) => {
      return key === undefined;
    };

    const numberHigerThanZero = (key: string | number | any[]) => {
      const toTest = parseInt(key as string);
      return !Number.isNaN(toTest) && toTest > 0;
    };

    //#region hearthbeat
    // authorization on hearthbeat
    const member = this.members[0];
    console.log(`📝 Heartbeat JWT...`);
    let [statusCode, response] = await Api.hearthbeat(
      this.demoProps,
      member,
      this.createHttpsAgent("", AuthKinds.JWT),
      access_token,
    );
    Demo.assert("OK statusCode", statusCode == 200);

    Demo.assertField(member.name, response, "policy", "jwt");
    Demo.assertField(member.name, response, "cert", undefined);

    console.log(`📝 Heartbeat member certs...`);
    [statusCode, response] = await Api.hearthbeat(
      this.demoProps,
      member,
      this.createHttpsAgent(member.id, AuthKinds.MemberCerts),
    );
    Demo.assert("OK statusCode", statusCode == 200);

    Demo.assertField(member.name, response, "policy", "member_cert");
    Demo.assertField(member.name, response, "cert", notUndefinedString);
    //#endregion
    //#region refresh
    // members 0 refresh key
    console.log(`📝 Refresh key...`);
    [statusCode, response] = await Api.refresh(
      this.demoProps,
      member,
      this.createHttpsAgent(member.id, AuthKinds.NoAuth),
    );
    Demo.assert("OK statusCode", statusCode == 200);

    Demo.assertField(member.name, response, "x", notUndefinedString);
    Demo.assertField(
      member.name,
      response,
      "kid",
      (key: string | number | any[]) => {
        return key !== undefined && (key as string).length > 40;
      },
    );
    Demo.assertField(member.name, response, "timestamp", numberHigerThanZero);
    Demo.assertField(member.name, response, "d", undefined);
    Demo.assertField(member.name, response, "crv", "X25519");
    Demo.assertField(member.name, response, "kty", "OKP");
    //#endregion
    //#region key
    console.log(`📝 Get initial key...`);
    let keyResponse;
    [statusCode, keyResponse] = await Api.key(
      this.demoProps,
      member,
      JSON.stringify(attestation),
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    ).catch((error) => {
      console.log(`keyInitial error: `, error);
      throw error;
    });
    Demo.assert("statusCode == 202", statusCode == 202);
    Demo.assert("response !== undefined", !keyResponse);

    console.log(`📝 Get initial key-Bad request...`);
    [statusCode, keyResponse] = await Api.key(
      this.demoProps,
      member,
      JSON.stringify(""),
      false,
      this.createHttpsAgent(member.id, AuthKinds.MemberCerts),
    ).catch((error) => {
      console.log(`keyInitial error: `, error);
      throw error;
    });
    Demo.assert("Bad request", statusCode == 400);
    Demo.assert(
      '(<any>keyResponse).error.message === "missing attestation"',
      (<any>keyResponse).error.message === "missing attestation",
    );

    console.log(`📝 Get initial key-No auth...`);
    [statusCode, keyResponse] = await Api.key(
      this.demoProps,
      member,
      JSON.stringify(attestation),
      false,
      this.createHttpsAgent(member.id, AuthKinds.NoAuth),
    ).catch((error) => {
      console.log(`keyInitial error: `, error);
      throw error;
    });
    Demo.assert("No auth", statusCode == 401);
    Demo.assert(
      '(<any>keyResponse).error.message === "Invalid authentication credentials."',
      (<any>keyResponse).error.message ===
        "Invalid authentication credentials.",
    );

    // Wait for receipt to be generated
    statusCode = 202;
    do {
      [statusCode, keyResponse] = await Api.key(
        this.demoProps,
        member,
        JSON.stringify(attestation),
        false,
        this.createHttpsAgent(member.id, AuthKinds.JWT),
        access_token,
      ).catch((error) => {
        console.log(`keyInitial error: `, error);
        throw error;
      });
      if (statusCode === 202) {
        await Demo.sleep(1000);
      } else if (statusCode !== 200) {
        throw new Error(`🛑 [TEST FAILURE]: Expected ${statusCode} to be 200`);
      }
    } while (statusCode !== 200);

    // Test with JWT
    console.log(`📝 Get wrapped key with JWT...`);
    [statusCode, keyResponse] = (await Api.key(
      this.demoProps,
      member,
      JSON.stringify(attestation),
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, IWrappedJwt];
    Demo.assert("Status OK", statusCode == 200);
    Demo.assertField(member.name, keyResponse, "d", undefinedString);
    Demo.assertField(member.name, keyResponse, "x", undefinedString);
    Demo.assertField(
      member.name,
      keyResponse,
      "wrapperKid",
      notUndefinedString,
    );
    Demo.assertField(
      member.name,
      keyResponse,
      "wrappedKeyId",
      notUndefinedString,
    );
    Demo.assertField(
      member.name,
      keyResponse,
      "wrappedKeyContents",
      notUndefinedString,
    );
    //#endregion
    //#region unwrap
    console.log(`📝 Get unwrapped key with JWT...`);
    let unwrapResponse;
    [statusCode, unwrapResponse] = (await Api.unwrap(
      this.demoProps,
      member,
      keyResponse.wrappedKeyContents,
      keyResponse.wrapperKid,
      attestation,
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, IKeyItem];
    console.log("JWT unwrapResponse: ", unwrapResponse);
    Demo.assert("Status OK", statusCode == 200);
    Demo.assertField(member.name, unwrapResponse, "d", notUndefinedString);
    Demo.assertField(member.name, unwrapResponse, "x", notUndefinedString);
    Demo.assertField(
      member.name,
      unwrapResponse,
      "receipt",
      notUndefinedString,
    );
    Demo.assertField(
      member.name,
      unwrapResponse,
      "kid",
      (key: string | number | any[]) => {
        return key !== undefined && (key as string).length > 40;
      },
    );
    Demo.assertField(
      member.name,
      unwrapResponse,
      "timestamp",
      numberHigerThanZero,
    );
    Demo.assertField(member.name, unwrapResponse, "crv", "X25519");
    Demo.assertField(member.name, unwrapResponse, "kty", "OKP");

    // Test with Tink
    // Get wrapped key
    let wrapResponse;
    [statusCode, wrapResponse] = (await Api.key(
      this.demoProps,
      member,
      JSON.stringify(attestation),
      true,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, IWrappedJwt];
    Demo.assert("OK statusCode", statusCode == 200);

    Demo.assertField(member.name, wrapResponse, "d", undefinedString);
    Demo.assertField(member.name, wrapResponse, "x", undefinedString);
    Demo.assertField(member.name, wrapResponse, "keys", notUndefinedArray);
    Demo.assert("wrapResponse.keys.length == 1", wrapResponse.keys.length == 1);
    const key = wrapResponse.keys[0];
    Demo.assertField(member.name, key, "keyData", notUndefinedArray);
    console.log("keyData: ", key.keyData);
    // TODO: check it's in format of 'encryptionKeys/100001'
    Demo.assertField(member.name, key, "name", notUndefinedString);
    Demo.assertField(
      member.name,
      key,
      "encryptionKeyType",
      "SINGLE_PARTY_HYBRID_KEY",
    );
    Demo.assertField(member.name, key, "publicKeysetHandle", "TBD");
    Demo.assertField(member.name, key, "publicKeyMaterial", "testtest");
    // TODO: improve checking time
    Demo.assertField(member.name, key, "creationTime", notUndefinedString);
    Demo.assertField(member.name, key, "expirationTime", notUndefinedString);

    // get unwrapped key
    const keyMaterial: any = JSON.parse(key.keyData[0].keyMaterial);

    // This is called 'resource name' as well.
    // It has a format of "azu-kms://<kid>"
    const encryptionKeyUri = key.keyData[0].keyEncryptionKeyUri;
    const kid = encryptionKeyUri.split("/")[2];
    console.log("kid: ", kid);
    [statusCode, unwrapResponse] = (await Api.unwrap(
      this.demoProps,
      member,
      keyMaterial.encryptedKeyset,
      kid as string,
      attestation,
      true,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, Uint8Array];
    Demo.assert("OK statusCode", statusCode == 200);
    Demo.assert(
      "unwrapResponse instanceof Uint8Array",
      unwrapResponse instanceof Uint8Array,
    );
    let keyset = new tink.Keyset();
    // Should not throw
    keyset.fromBinary(unwrapResponse);
    console.log("keyset.toJsonString()", keyset.toJsonString());
    let tinkHpkeKey = new hpke.HpkePrivateKey();
    // Should not throw
    tinkHpkeKey.fromBinary(keyset.key[0].keyData!.value!);
    console.log("tinkHpkeKey.toJsonString()", tinkHpkeKey.toJsonString());
    //#endregion

    await this.addCheckpoint("Key generation Stage Complete");

    this.printTestSectionHeader("🎉 All Tests Passed...");
  }

  private static assert(expression: string, expressionValue: boolean) {
    if (expressionValue) {
      console.log(`✅ [PASS] - Assert ${expression}`);
    } else {
      throw new Error(
        `🛑 [TEST FAILURE]: Expected ${expression} to be true but got false`,
      );
    }
  }

  private static assertField(
    memberName: string,
    toTest: any,
    fieldName: string,
    expectedValue:
      | string
      | number
      | undefined
      | ((expectedValue: string | number | any[], size?: number) => boolean),
  ) {
    const currentValue = toTest[fieldName];
    let expected = false;
    if (expectedValue) {
      if (typeof expectedValue === "function") {
        expected = expectedValue(currentValue);
      } else {
        expected = currentValue === expectedValue;
      }
    } else {
      expected = currentValue === undefined;
    }

    if (expected) {
      console.log(
        `✅ [PASS] - Assert ${memberName}::${fieldName} == ${currentValue}`,
      );
    } else {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected ${fieldName} for ${memberName} - Current: ${currentValue}. Expected: ${expectedValue}`,
      );
    }
  }

  private static createMember(memberId: string): DemoMemberProps {
    return {
      id: memberId,
      name: `Member ${memberId}`,
      data: this.memberDataMap.get(memberId),
    };
  }

  private static createHttpsAgent(
    memberId: string,
    authKind: AuthKinds,
  ): https.Agent {
    switch (authKind) {
      case AuthKinds.JWT:
        console.log(
          `Return http agent with access token for ${certificateStorePath}`,
        );
        return new https.Agent({
          ca: fs.readFileSync(`${certificateStorePath}/service_cert.pem`),
          rejectUnauthorized: true,
        });
      case AuthKinds.MemberCerts:
        console.log(
          `Return http agent with member certs for ${certificateStorePath}`,
        );
        return new https.Agent({
          cert: fs.readFileSync(
            `${certificateStorePath}/member${memberId}_cert.pem`,
          ),
          key: fs.readFileSync(
            `${certificateStorePath}/member${memberId}_privk.pem`,
          ),
          ca: fs.readFileSync(`${certificateStorePath}/service_cert.pem`),
        });
    }
    const ca = fs
      .readFileSync(`${certificateStorePath}/service_cert.pem`)
      .toString();
    console.log(
      `Return http agent with no auth for ${certificateStorePath}`,
      ca,
    );
    return new https.Agent({
      ca: fs.readFileSync(`${certificateStorePath}/service_cert.pem`),
    });
  }

  private static printTestSectionHeader(title: string) {
    console.log("\n===============================================");
    console.log(`${title}`);
    console.log("===============================================");
  }

  private static async addCheckpoint(msg: string) {
    if (interactiveMode == "1") {
      console.log("\n");
      await inquirer.prompt([
        {
          name: msg,
          message: `🎬 ${msg}\n - Press return key to continue...`,
        },
      ]);
    }
  }
}

Demo.start();
console.log("Demo.start() finished");
