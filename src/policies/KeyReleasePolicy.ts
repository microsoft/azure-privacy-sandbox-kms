import { IKeyReleasePolicy } from "./IKeyReleasePolicy";

export class KeyReleasePolicy implements IKeyReleasePolicy {
  public type = "add";
  public claims = {
    "x-ms-attestation-type": ["snp"],
  };
}
