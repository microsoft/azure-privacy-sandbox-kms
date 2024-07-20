import { ccf } from "@microsoft/ccf-app/global";
import { Logger } from "../../utils/Logger";

const validationPolicyMapName = "public:ccf.gov.policies.jwt_validation";

export class JwtValidationPolicyMap {
  public static read(issuer: string): { [key: string]: string } | undefined {
    // For testing list all issuers
    const issuersMap = ccf.kv["public:ccf.gov.jwt.issuers"];
    issuersMap.forEach((v, k) => {
      let issuer = ccf.bufToStr(k);
      let info = ccf.bufToJsonCompatible(v);
      Logger.debug(`Issuer: ${issuer}: ${JSON.stringify(info)}`);
    });

    const keyBuf = ccf.strToBuf(issuer);
    if (!ccf.kv[validationPolicyMapName].has(keyBuf)) {
      Logger.error(`No JWT validation Policy for issuer: ${issuer}`);
      return undefined;
    }

    const policyBuf = ccf.kv[validationPolicyMapName].get(keyBuf);
    if (policyBuf === undefined) {
      Logger.error(`Policy buffer is undefined for issuer: ${issuer}`);
      return undefined;
    }

    const policy = ccf.bufToStr(policyBuf);
    Logger.info(`JWT validation: Policy: ${policy} for issuer: ${issuer}`);
    return JSON.parse(policy);
  }
}