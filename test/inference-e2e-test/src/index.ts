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
//import { ISnpAttestation } from "../../../src/attestation/ISnpAttestation.js";
/*
const readJSON = async (filePath: string): Promise<any> => {
  try {
    const fileContents = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContents);
  } catch (error: any) {
    throw new Error(`Error reading JSON file: ${error.message}`);
  }
};
*/
const serverUrl = process.env.SERVER!;
const certificateStorePath = process.env.CERTS_FOLDER!;
const interactiveMode = process.env.INTERACTIVE_MODE!;

export interface DemoProps {
  url: string;
  refreshPath: string;
  proposalPath: string;
  keyPath: string;
  unwrapPath: string;
  heartbeatPath: string;
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
    heartbeatPath: `/app/heartbeat`,
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

    this.printTestSectionHeader(
      `🏁 Starting e2e Tests on server ${serverUrl} for kms`,
    );

    for (const memberId of this.memberIds) {
      const member = this.createMember(memberId);
      this.members.push(member);
    }

    this.printTestSectionHeader("🔬 [TEST]: Setup kms");
    await Demo.executeCommand(`make setup-inference >/tmp/make.txt`);

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

    this.printTestSectionHeader("🔬 [TEST]: Key generation Service");
    /*
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
    */
    //#region heartbeat
    // authorization on heartbeat
    const member = this.members[0];
    console.log(`📝 Heartbeat...`);
    let [statusCode, _] = await Api.heartbeat(
      this.demoProps,
      member,
      this.createHttpsAgent("", AuthKinds.NoAuth),
      access_token,
    );
    Demo.assert("OK statusCode", statusCode == 200);
    //#endregion

    //#region refresh
    // members 0 refresh key
    console.log(`📝 Refresh key...`);
    let response: IKeyItem;
    [statusCode, response] = await Api.refresh(
      this.demoProps,
      member,
      this.createHttpsAgent(member.id, AuthKinds.NoAuth),
    );
    Demo.assert("OK statusCode", statusCode == 200);
    Demo.assert("OK key", response.kty != undefined);
    //#endregion

    //#region key
    console.log(`📝 Get initial key...`);
    let keyResponse;
    let headers: { [key: string]: string | number };
    [
      statusCode,
      headers,
      keyResponse] = await Api.key(
        this.demoProps,
        member,
        private_wrapping_key,
        public_wrapping_key,
        undefined,
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

    console.log(`📝 Get initial key-No auth...`);
    [statusCode, headers, keyResponse] = await Api.key(
      this.demoProps,
      member,
      private_wrapping_key,
      public_wrapping_key,
      undefined,
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
      [statusCode, headers, keyResponse] = await Api.key(
        this.demoProps,
        member,
        private_wrapping_key,
        public_wrapping_key,
        undefined,
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
    } while (statusCode == 202);

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

  /*
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
*/
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
