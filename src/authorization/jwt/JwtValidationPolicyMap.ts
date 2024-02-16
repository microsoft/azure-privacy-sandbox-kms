import { ccf } from "@microsoft/ccf-app/global";

const validationPolicyMapName = "public:ccf.gov.policies.jwt_validation";

export class JwtValidationPolicyMap {
  public static read(issuer: string): { [key: string]: string } | undefined {
    // For testing list all issuers
    const issuersMap = ccf.kv["public:ccf.gov.jwt.issuers"];
    issuersMap.forEach((v, k) => {
      let issuer = ccf.bufToStr(k);
      let info = ccf.bufToJsonCompatible(v);
      console.log(`Issuer: ${issuer}: ${JSON.stringify(info)}`);
    });

    const keyBuf = ccf.strToBuf(issuer);
    if (!ccf.kv[validationPolicyMapName].has(keyBuf)) {
      console.log(`No JWT validation Policy for issuer: ${issuer}`);
      return undefined;
    }

    const policy = ccf.bufToStr(ccf.kv[validationPolicyMapName].get(keyBuf));
    console.log(`JWT validation: Policy: ${policy} for issuer: ${issuer}`);
    return JSON.parse(policy);
  }
}
