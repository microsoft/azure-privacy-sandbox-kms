import { DemoMemberProps, DemoProps } from "./index";
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { IKeyItem } from "../../../src";
import { IWrapped, IWrappedJwt } from "../../../src/endpoints/KeyWrapper";
import { ISnpAttestation } from "../../../src/attestation/ISnpAttestation";

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
      httpsAgent: props.member.httpsAgent,
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
  public static async refresh(
    props: DemoProps,
    member: DemoMemberProps,
  ): Promise<IKeyItem> {
    console.log(`📝 ${member.name} Refresh key:`);

    const result = await axios.post(props.refreshUrl, "", {
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent: member.httpsAgent,
    });

    if (result.status !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${result.status}`,
      );
    }

    console.log(
      `✅ [PASS] [${result.status} : ${result.statusText}] - ${member.name}`,
    );
    console.log(result.data);

    return result.data;
  }
  public static async keyInitial(
    props: DemoProps,
    member: DemoMemberProps,
    data: string,
  ): Promise<IKeyItem> {
    console.log(`📝 ${member.name} Get initial wrapped private key:`);

    const result = await axios.post(props.keyUrl, data, {
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent: member.httpsAgent,
    });

    if (result.status !== 202) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${result.status}, ${result.data}`,
      );
    }

    console.log(
      `✅ [PASS] [${result.status} : ${result.statusText}] - ${member.name}`,
    );
    console.log(result.data);

    return result.data;
  }

  public static async key(
    props: DemoProps,
    member: DemoMemberProps,
    data: string,
    tink: boolean,
  ): Promise<IWrapped | IWrappedJwt> {
    console.log(`📝 ${member.name} Get wrapped private key with receipt:`);
    const query = tink ? "?fmt=tink" : "";
    const result: AxiosResponse<any, any> = await axios
      .post(props.keyUrl + query, data, {
        headers: {
          "Content-Type": "application/json",
        },
        httpsAgent: member.httpsAgent,
      })
      .catch((exception: any) => {
        console.log(`key exception: ${exception.errorMessage}`);
        return exception;
      });

    if (result.status !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${result.status}`,
      );
    }

    console.log(
      `✅ [PASS] [${result.status} : ${result.statusText}] - ${member.name}`,
    );
    console.log(result.data);

    return result.data;
  }

  public static async unwrap(
    props: DemoProps,
    member: DemoMemberProps,
    wrapped: string,
    kid: string,
    attestation: ISnpAttestation,
    tink: boolean,
  ): Promise<Uint8Array | IKeyItem> {
    console.log(`📝 ${member.name} Get unwrapped private key with receipt:`);
    const query = tink ? "?fmt=tink" : "";
    const responseType = tink ? "arraybuffer" : "json";
    const result: AxiosResponse<any, any> = await axios
      .post(
        props.unwrapUrl + query,
        JSON.stringify({ wrapped, kid, attestation }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          httpsAgent: member.httpsAgent,
          responseType: responseType,
        },
      )
      .catch((exception: any) => {
        console.log(`key exception: ${exception}`);
        return exception;
      });

    if (result.status !== 200) {
      throw new Error(
        `🛑 [TEST FAILURE]: Unexpected status code: ${result.status}`,
      );
    }

    console.log(
      `✅ [PASS] [${result.status} : ${result.statusText}] - ${member.name}`,
    );
    if (tink) {
      const res = new Uint8Array(result.data);
      console.log(res);
      return res;
    } else {
      console.log(result.data);
      return result.data;
    }
  }
}
