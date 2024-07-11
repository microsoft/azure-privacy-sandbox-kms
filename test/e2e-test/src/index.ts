// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Api from "./api.js";
import path from "path";
import { member0DataPart1, member1Data, member2Data } from "./data.js";
import { exec } from "child_process";
import https from "https";
import fs from "fs";
import inquirer from "inquirer";
import { IKeyItem } from "../../../src";
import { ISnpAttestation } from "../../../src/attestation/ISnpAttestation.js";

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
  keyReleasePolicyPath: string;
  pubkeyPath: string;
  listpubkeysPath: string;
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
    keyReleasePolicyPath: `/app/keyReleasePolicy`,
    pubkeyPath: `/app/pubkey`,
    listpubkeysPath: `/app/listpubkeys`,
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
    this.printTestSectionHeader("🔬 [TEST]: Starting...");
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
    await Demo.executeCommand(`make setup >/tmp/make.txt`);

    this.printTestSectionHeader("🔬 [TEST]: generate access token");
    const access_token = await Demo.executeCommand(
      `./scripts/authorization_header.sh`,
    );
    console.log(`Authorization header: ${access_token}`);

    this.printTestSectionHeader("🔬 [TEST]: set wrapping keys");
    const public_wrapping_key: string = fs
      .readFileSync("test/data-samples/publicWrapKey.pem", "utf-8")
      .replace(/\\n/g, "\n");
    console.log(`Public wrapping key: `, public_wrapping_key);
    const private_wrapping_key: string = fs
      .readFileSync("test/data-samples/privateWrapKey.pem", "utf-8")
      .replace(/\\n/g, "\n");
    console.log(`Private wrapping key: `, private_wrapping_key);

    process.chdir("../../");

    this.printTestSectionHeader("🔬 [TEST]: Key generation Service");

    const notUndefinedString = (key: string | number | any[]) => {
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
    let headers: { [key: string]: string | number };
    [headers, statusCode, keyResponse] = await Api.key(
      this.demoProps,
      member,
      attestation,
      private_wrapping_key,
      public_wrapping_key,
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    ).catch((error) => {
      console.log(`keyInitial error: `, error);
      throw error;
    });
    console.log("initial keyResponse: ", keyResponse);

    Demo.assert("statusCode == 202", statusCode == 202);
    Demo.assert(`headers["retry-after"] == 3`, headers["retry-after"] == 3);

    Demo.assert("response === undefined", !keyResponse);

    console.log(`📝 Get initial key-Bad request...`);
    [headers, statusCode, keyResponse] = await Api.key(
      this.demoProps,
      member,
      {} as ISnpAttestation,
      private_wrapping_key,
      public_wrapping_key,
      false,
      this.createHttpsAgent(member.id, AuthKinds.MemberCerts),
    ).catch((error) => {
      console.log(`keyInitial error: `, error);
      throw error;
    });
    Demo.assert("Bad request", statusCode == 400);

    console.log(`📝 Get initial key-No auth...`);
    [headers, statusCode, keyResponse] = await Api.key(
      this.demoProps,
      member,
      attestation,
      private_wrapping_key,
      public_wrapping_key,
      false,
      this.createHttpsAgent(member.id, AuthKinds.NoAuth),
    ).catch((error) => {
      console.log(`keyInitial error: `, error);
      throw error;
    });
    console.log(`response after 202: `, keyResponse);
    Demo.assert("No auth", statusCode == 401);
    Demo.assert(
      '(<any>keyResponse).error.message === "Invalid authentication credentials."',
      (<any>keyResponse).error.message ===
        "Invalid authentication credentials.",
    );

    // Wait for receipt to be generated
    statusCode = 202;
    do {
      [headers, statusCode, keyResponse] = await Api.key(
        this.demoProps,
        member,
        attestation,
        private_wrapping_key,
        public_wrapping_key,
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
    [headers, statusCode, keyResponse] = (await Api.key(
      this.demoProps,
      member,
      attestation,
      private_wrapping_key,
      public_wrapping_key,
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [{ [key: string]: string | number }, number, any];
    Demo.assert("Status OK", statusCode == 200);
    Demo.assertField(member.name, keyResponse, "d", undefinedString);
    Demo.assertField(member.name, keyResponse, "x", undefinedString);
    Demo.assertField(
      member.name,
      keyResponse,
      "wrappedKid",
      notUndefinedString,
    );
    Demo.assertField(member.name, keyResponse, "receipt", notUndefinedString);
    //#endregion
    //#region unwrap
    console.log(`📝 Get unwrapped key with JWT...`);
    let unwrapResponse;
    [statusCode, unwrapResponse] = (await Api.unwrap(
      this.demoProps,
      member,
      keyResponse.wrappedKid,
      attestation,
      private_wrapping_key,
      public_wrapping_key,
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, IKeyItem];
    console.log("JWT unwrapResponse: ", unwrapResponse);
    const keyInResponse = unwrapResponse.key;
    const receipt = { receipt: unwrapResponse.receipt };
    Demo.assert("Status OK", statusCode == 200);
    Demo.assertField(member.name, keyInResponse, "d", notUndefinedString);
    Demo.assertField(member.name, keyInResponse, "x", notUndefinedString);
    Demo.assertField(
      member.name,
      keyInResponse,
      "kid",
      (key: string | number | any[]) => {
        return key !== undefined && (key as string).length > 40;
      },
    );
    Demo.assertField(
      member.name,
      keyInResponse,
      "timestamp",
      numberHigerThanZero,
    );
    Demo.assertField(member.name, keyInResponse, "crv", "X25519");
    Demo.assertField(member.name, keyInResponse, "kty", "OKP");
    Demo.assertField(member.name, receipt, "receipt", notUndefinedString);

    console.log(`📝 Get unwrapped key with JWT and missing wrappingKey...`);
    [statusCode, unwrapResponse] = (await Api.unwrap(
      this.demoProps,
      member,
      keyResponse.wrappedKid,
      attestation,
      private_wrapping_key,
      undefined,
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, IKeyItem];
    console.log("JWT unwrapResponse: ", unwrapResponse);
    Demo.assert("Status BadRequest", statusCode == 400);

    console.log(`📝 Get unwrapped key with JWT and wrong wrappingKey: `);
    const badPublicKey = public_wrapping_key
      .replace("1", "9")
      .replace("2", "1");

    [statusCode, unwrapResponse] = (await Api.unwrap(
      this.demoProps,
      member,
      keyResponse.wrappedKid,
      attestation,
      private_wrapping_key,
      badPublicKey,
      false,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, IKeyItem];
    console.log("JWT unwrapResponse: ", unwrapResponse);
    Demo.assert("Status BadRequest", statusCode === 400);

    // Test with Tink
    console.log(`📝 Get wrapped key with tink...`);
    let wrapResponse;
    [headers, statusCode, wrapResponse] = (await Api.key(
      this.demoProps,
      member,
      attestation,
      private_wrapping_key,
      public_wrapping_key,
      true,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [{ [key: string]: string | number }, number, any];
    Demo.assert("OK statusCode", statusCode === 200);

    Demo.assertField(member.name, wrapResponse, "d", undefinedString);
    Demo.assertField(member.name, wrapResponse, "x", undefinedString);
    Demo.assert(
      "typeof wrapResponse.wrappedKid === 'string'",
      typeof wrapResponse.wrappedKid === "string",
    );
    Demo.assert(
      "typeof wrapResponse.wrapped === 'string'",
      typeof wrapResponse.wrapped === "string",
    );
    Demo.assert(
      "typeof wrapResponse.receipt === 'string'",
      typeof wrapResponse.receipt === "string",
    );

    console.log(`Unwrap result: `, wrapResponse.wrappedKid);

    const kid = wrapResponse.wrappedKid;
    console.log("kid: ", kid);

    console.log(`📝 Get private key with tink...`);
    [statusCode, unwrapResponse] = (await Api.unwrap(
      this.demoProps,
      member,
      kid as string,

      attestation,
      private_wrapping_key,
      public_wrapping_key,
      true,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    )) as [number, Uint8Array];
    Demo.assert("OK statusCode", statusCode == 200);
    Demo.assert(
      "typeof unwrapResponse.wrapped === 'string'",
      typeof unwrapResponse.wrapped === "string",
    );

    //const wrappedBuf = Base64.toUint8Array(unwrapResponse.wrapped);
    //let tinkHpkeKey = new hpke.HpkePrivateKey();
    //tinkHpkeKey.fromBinary(new Uint8Array(wrappedBuf),);
    //Demo.assert(
    //  "tinkHpkeKey.privateKey instanceof Uint8Array",
    //  tinkHpkeKey.privateKey instanceof Uint8Array,
    //);

    //console.log("tinkHpkeKey.toJsonString()", tinkHpkeKey.toJsonString());

    //#endregion

    //#region keyReleasePolicy
    console.log(`📝 Get key release policy...`);
    [statusCode, keyResponse] = await Api.keyReleasePolicy(
      this.demoProps,
      member,
      this.createHttpsAgent(member.id, AuthKinds.MemberCerts),
    ).catch((error) => {
      console.log(`keyReleasePolicy error: `, error);
      throw error;
    });
    Demo.assert("statusCode == 200", statusCode == 200);

    console.log("keyReleasePolicy response: ", keyResponse);
    Demo.assert(
      `keyResponse["x-ms-sevsnpvm-smt-allowed"][0] === true`,
      keyResponse["x-ms-sevsnpvm-smt-allowed"][0] === true,
    );
    Demo.assert(
      `keyResponse["x-ms-ver"][0] === '2'`,
      keyResponse["x-ms-ver"][0] === "2",
    );
    Demo.assert(
      `keyResponse["x-ms-sevsnpvm-is-debuggable"][0] === false`,
      keyResponse["x-ms-sevsnpvm-is-debuggable"][0] === false,
    );

    // JWT not allowed
    [statusCode, keyResponse] = await Api.keyReleasePolicy(
      this.demoProps,
      member,
      this.createHttpsAgent(member.id, AuthKinds.JWT),
      access_token,
    ).catch((error) => {
      console.log(`keyReleasePolicy error: `, error);
      throw error;
    });
    Demo.assert("statusCode == 401", statusCode == 401);

    //#endregion

    //#region pubkey
    console.log(`📝 Get pubkey...`);
    [statusCode, keyResponse] = await Api.pubkey(
      this.demoProps,
      member,
      "kid",
      "fmt",
      this.createHttpsAgent(member.id, AuthKinds.MemberCerts),
    ).catch((error) => {
      console.log(`keyReleasePolicy error: `, error);
      throw error;
    });
    Demo.assert("statusCode == 200", statusCode == 200);

    console.log("pubkey response: ", keyResponse);

    Demo.assert(`keyResponse.crv === 'X25519'`, keyResponse.crv === "X25519");
    Demo.assertField(member.name, keyResponse, "kid", notUndefinedString);
    Demo.assertField(member.name, keyResponse, "x", notUndefinedString);
    Demo.assertField(member.name, keyResponse, "receipt", notUndefinedString);

    Demo.assert(`keyResponse.timestamp > 0`, keyResponse.timestamp > 0);
    Demo.assert(`keyResponse.id > 100000`, keyResponse.id > 100000);
    //#endregion

    //#region listpubkeys
    console.log(`📝 Get listpubkeys...`);
    [statusCode, keyResponse, headers] = await Api.listpubkeys(
      this.demoProps,
      member,
      this.createHttpsAgent(member.id, AuthKinds.MemberCerts),
    ).catch((error) => {
      console.log(`keyReleasePolicy error: `, error);
      throw error;
    });
    Demo.assert("statusCode == 200", statusCode == 200);

    console.log("listpubkeys response: ", keyResponse);

    Demo.assertField(
      member.name,
      keyResponse.keys[0],
      "key",
      notUndefinedString,
    );
    Demo.assertField(
      member.name,
      keyResponse.keys[0],
      "id",
      notUndefinedString,
    );
    Demo.assert(
      `headers["cache-control"] == "max-age=254838"`,
      headers["cache-control"] == "max-age=254838",
    );

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

console.log("Starting...");
Demo.start();
console.log("Demo.start() finished");
