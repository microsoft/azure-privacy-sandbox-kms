import Api, { Validator } from "./api.js";
import path from 'path';
import {
  member0DataPart1,
  member0DataPart2,
  member1Data,
  member2Data,
} from "./data.js";
import { exec } from 'child_process';
import https from "https";
import fs from "fs";
import inquirer from "inquirer";
import { IKeyItem } from "../../../src";
import * as tink from "../../../src/endpoints/proto/gen/tink_pb.js"
import * as hpke from "../../../src/endpoints/proto/gen/hpke_pb.js"
import { IWrapped, IWrappedJwt } from "../../../src/endpoints/KeyWrapper.js";

const readJSON = async (filePath: string): Promise<any> => {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error) {
    throw new Error(`Error reading JSON file: ${error.message}`);
  }
}

const serverUrl = process.env.SERVER!;
const certificateStorePath = process.env.CERTS_FOLDER!;
const interactiveMode = process.env.INTERACTIVE_MODE!;

export interface DemoProps {
  refreshUrl: string;
  proposalUrl: string;
  keyUrl: string;
  unwrapUrl: string;
}

export interface DemoMemberProps {
  id: string;
  name: string;
  data: unknown;
  httpsAgent: https.Agent;
}

class Demo {
  //
  private static readonly demoProps: DemoProps = {
    refreshUrl: `${serverUrl}/app/refresh`,
    proposalUrl: `${serverUrl}/gov/proposals`,
    keyUrl: `${serverUrl}/app/key`,
    unwrapUrl: `${serverUrl}/app/unwrapKey`
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
  }

  private static sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static async start() {
    /**
     * Change working directory to the root of the project
     * All paths and process execution will be relative to root
     */
    const originalDirectory = path.resolve();
    console.log(`Original directory: ${originalDirectory}`);
    const attestation = await readJSON('test/attestation-samples/snp.json');

    this.printTestSectionHeader(
      `🏁 Starting e2e Tests on server ${serverUrl} for kms`
    );

    for (const memberId of this.memberIds) {
      const member = this.createMember(memberId);
      this.members.push(member);
    }

    this.printTestSectionHeader("🔬 [TEST]: Propose and vote key release policy");
    const output = await Demo.executeCommand(`make propose-add-key-release-policy >/tmp/make.txt`);
    console.log(output);
    process.chdir("../../");

    this.printTestSectionHeader("🔬 [TEST]: Key generation Service");

    const notUndefinedString = (key: string | number | any[]) => {
      return key !== undefined;
    }

    const notUndefinedArray = (key: string | number | any[]) => {
      return key !== undefined;
    }
    
    const undefinedString = (key: string | number | any[]) => {
      return key === undefined;
    }

    const numberHigerThanZero = (key: string | number | any[]) => {
      const toTest = parseInt(key as string);
      return !Number.isNaN(toTest) && toTest > 0;
  }

    // members 0 refresh key
    console.log(`📝 Refresh key...`);
    const member = this.members[0];
    let response = await Api.refresh(this.demoProps, member);
    
    Demo.assertField(member.name, response, "x", notUndefinedString);
    Demo.assertField(
      member.name,
      response,
      "kid",
      (key: string | number | any[]) => {
        return key !== undefined && (key as string).length > 40;
      }
    );
    Demo.assertField(member.name, response, "timestamp", numberHigerThanZero);
    Demo.assertField(member.name, response, "d", undefined);
    Demo.assertField(member.name, response, "crv", "X25519");
    Demo.assertField(member.name, response, "kty", "OKP");
    
    const _ = await Api.keyInitial(this.demoProps, member, JSON.stringify(attestation))
      .catch((error) => {
        console.log(`keyInitial error: ${error?.response?.data?.nessage}`)
        throw error;
      })
    
    // Wait for receipt to be generated
    await Demo.sleep(5000);

    {
      // Test with JWT
      // Get wrapped key
      const wrapResponse = (await Api.key(this.demoProps, member, JSON.stringify(attestation), false) as IWrappedJwt);
      Demo.assertField(member.name, wrapResponse, "d", undefinedString);
      Demo.assertField(member.name, wrapResponse, "x", undefinedString);
      Demo.assertField(member.name, wrapResponse, "wrapperKid", notUndefinedString);
      Demo.assertField(member.name, wrapResponse, "wrappedKeyId", notUndefinedString);
      Demo.assertField(member.name, wrapResponse, "wrappedKeyContents", notUndefinedString);

      const unwrapResponse = (await Api.unwrap(this.demoProps, member, wrapResponse.wrappedKeyContents, wrapResponse.wrapperKid , attestation, false) as IKeyItem);
      console.log("JWT unwrapResponse: ", unwrapResponse);
      Demo.assertField(member.name, unwrapResponse, "d", notUndefinedString);
      Demo.assertField(member.name, unwrapResponse, "x", notUndefinedString);
      Demo.assertField(member.name, unwrapResponse, "receipt", notUndefinedString);
      Demo.assertField(
        member.name,
        unwrapResponse,
        "kid",
        (key: string | number | any[]) => {
          return key !== undefined && (key as string).length > 40;
        }
      );
      Demo.assertField(member.name, unwrapResponse, "timestamp", numberHigerThanZero);
      Demo.assertField(member.name, unwrapResponse, "crv", "X25519");
      Demo.assertField(member.name, unwrapResponse, "kty", "OKP");
        // Test ci for failed workflow
      Demo.assertField(member.name, unwrapResponse, "kty", "xxx");
    }
    
    {
      // Test with Tink
      // Get wrapped key
      const wrapResponse = (await Api.key(this.demoProps, member, JSON.stringify(attestation), true) as IWrapped);
      Demo.assertField(member.name, wrapResponse, "d", undefinedString);
      Demo.assertField(member.name, wrapResponse, "x", undefinedString);
      Demo.assertField(member.name, wrapResponse, "keys", notUndefinedArray);
      Demo.assert("wrapResponse.keys.length == 1", wrapResponse.keys.length == 1)
      const key = wrapResponse.keys[0]
      Demo.assertField(member.name, key, "keyData", notUndefinedArray);
      console.log("keyData: ", key.keyData);
      // TODO: check it's in format of 'encryptionKeys/100001'
      Demo.assertField(member.name, key, "name", notUndefinedString);
      Demo.assertField(member.name, key, "encryptionKeyType", "SINGLE_PARTY_HYBRID_KEY");
      Demo.assertField(member.name, key, "publicKeysetHandle", "TBD");
      Demo.assertField(member.name, key, "publicKeyMaterial", "testtest");
      // TODO: improve checking time
      Demo.assertField(member.name, key, "creationTime", notUndefinedString);
      Demo.assertField(member.name, key, "expirationTime", notUndefinedString);

      // get unwrapped key
      const keyMaterial: any = JSON.parse(key.keyData[0].keyMaterial);

      // This is called 'resource name' as well.
      // It has a format of "azu-kms://<kid>"
      const encryptionKeyUri = key.keyData[0].keyEncryptionKeyUri
      const kid = encryptionKeyUri.split('/')[2];
      console.log("kid: ", kid)
      const unwrapResponse = (await Api.unwrap(this.demoProps, member, keyMaterial.encryptedKeyset, kid as string , attestation, true) as Uint8Array);
      Demo.assert("unwrapResponse instanceof Uint8Array", unwrapResponse instanceof Uint8Array);
      let keyset = new tink.Keyset();
      // Should not throw
      keyset.fromBinary(unwrapResponse);
      console.log("keyset.toJsonString()", keyset.toJsonString());
      let tinkHpkeKey = new hpke.HpkePrivateKey();
      // Should not throw
      tinkHpkeKey.fromBinary(keyset.key[0].keyData!.value!)
      console.log("tinkHpkeKey.toJsonString()", tinkHpkeKey.toJsonString());
    }

    await this.addCheckpoint("Key generation Stage Complete");

    this.printTestSectionHeader("🎉 All Tests Passed...");
  }

  private static assert(expression: string, expressionValue: boolean) {
    if (expressionValue) {
      console.log(
        `✅ [PASS] - Assert ${expression}`
      );
    } else {
      throw new Error(
        `🛑 [TEST FAILURE]: Expected ${expression} to be true but got false`
      );
    }
  }

  private static assertField(
    memberName: string,
    toTest: any,
    fieldName: string,
    expectedValue: string | number | undefined | ((expectedValue: (string | number | any[]), size?: number) => boolean)
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
      expected =  currentValue === undefined
    }

    if (expected) {
      console.log(
        `✅ [PASS] - Assert ${memberName}::${fieldName} == ${currentValue}`
      );
    } else {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected ${fieldName} for ${memberName} - Current: ${currentValue}. Expected: ${expectedValue}`
      );
    }
  }

  private static createMember(memberId: string): DemoMemberProps {
    return {
      id: memberId,
      name: `Member ${memberId}`,
      data: this.memberDataMap.get(memberId),
      httpsAgent: this.createHttpsAgent(memberId),
    };
  }

  private static createHttpsAgent(memberId: string): https.Agent {
    return new https.Agent({
      cert: fs.readFileSync(
        `${certificateStorePath}/member${memberId}_cert.pem`
      ),
      key: fs.readFileSync(
        `${certificateStorePath}/member${memberId}_privk.pem`
      ),
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
