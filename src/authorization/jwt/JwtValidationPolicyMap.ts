import { ccf } from "@microsoft/ccf-app/global";
import { Logger, LogContext } from "../../utils/Logger";

export const validationPolicyMapName = "public:policies.jwt_validation";

export class JwtValidationPolicyMap {
  public static read(issuer: string, logContextIn? : LogContext): { [key: string]: string } | undefined {
    const logContext = (logContextIn?.clone() || new LogContext()).appendScope("JwtValidationPolicyMap");
    // For testing list all issuers
    const issuersMap = ccf.kv["public:ccf.gov.jwt.issuers"];
    issuersMap.forEach((v, k) => {
      let issuer = ccf.bufToStr(k);
      let info = ccf.bufToJsonCompatible(v);
      Logger.debug(`Issuer: ${issuer}: ${JSON.stringify(info)}`, logContext);
    });

    const keyBuf = ccf.strToBuf(issuer);
    if (!ccf.kv[validationPolicyMapName].has(keyBuf)) {
      Logger.error(`No JWT validation Policy for issuer: ${issuer}`, logContext);
      return undefined;
    }

    const policyBuf = ccf.kv[validationPolicyMapName].get(keyBuf);
    if (policyBuf === undefined) {
      Logger.error(`Policy buffer is undefined for issuer: ${issuer}`, logContext);
      return undefined;
    }

    const policy = ccf.bufToStr(policyBuf);
    Logger.debug(`JWT validation: Policy: ${policy} for issuer: ${issuer}`, logContext);
    return JSON.parse(policy);
  }
}
