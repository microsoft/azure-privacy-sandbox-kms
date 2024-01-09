import * as ccfcrypto from "@microsoft/ccf-app/crypto";
import { ccf } from "@microsoft/ccf-app/global";
import { Base64 } from "js-base64";
import { IKeyItem } from "./IKeyItem";

export class KeyGeneration {
  // Calculate a unique kid for the new key
  public static calculateKid = (pubkey: string) => {
    const buf = ccf.strToBuf(pubkey);
    const digest = new Uint8Array(ccfcrypto.digest("SHA-256", buf));
    return Base64.fromUint8Array(digest, true);
  };

  // Generate new key item
  public static generateKeyItem = (id: number): IKeyItem => {
    const keyType = "x25519";
    const keys = ccfcrypto.generateEddsaKeyPair(keyType);
    const jwk: IKeyItem = ccfcrypto.eddsaPemToJwk(
      keys.privateKey,
      KeyGeneration.calculateKid(keys.publicKey)
    );
    // jwk.d is private key, jwk.x is public key

    // We will get an untrusted timestamp from the host. Is this a threat?
    jwk.timestamp = Date.now();
    jwk.id = id;
    
    console.log(`JWK: `, jwk);
    return jwk;
  };
}
