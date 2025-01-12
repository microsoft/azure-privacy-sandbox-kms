import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyRotationPolicy } from "./IKeyRotationPolicy";
import { Logger, LogContext } from "../utils/Logger";
import { KmsError } from "../utils/KmsError";

/**
 * Class representing a Key Rotation Policy.
 */
export class KeyRotationPolicy {
  /**
   * Constructs a new KeyRotationPolicy instance.
   * @param keyRotationPolicy - The key rotation policy settings.
   */
  constructor(public keyRotationPolicy: IKeyRotationPolicy) {}

  /**
   * The log context for the KeyRotationPolicy class.
   * @private
   */
  private static readonly logContext = new LogContext().appendScope(
    "KeyRotationPolicy"
  );

  /**
   * Returns the default key rotation policy.
   * @returns The default key rotation policy.
   */
  public static defaultKeyRotationPolicy(): IKeyRotationPolicy {
    return {
      rotationIntervalSeconds: 300,
      gracePeriodSeconds: 60,
    };
  }

  /**
   * Logs the key rotation policy settings.
   * @param keyRotationPolicy - The key rotation policy to log.
   */
  public static logKeyRotationPolicy(
    keyRotationPolicy: IKeyRotationPolicy
  ): void {
    Logger.debug(
      `Rotation Interval Seconds: ${keyRotationPolicy.rotationIntervalSeconds}`,
      KeyRotationPolicy.logContext
    );
    Logger.debug(
      `Grace Period Seconds: ${keyRotationPolicy.gracePeriodSeconds}`,
      KeyRotationPolicy.logContext
    );
  }

  /**
   * Loads the key rotation from the key rotation policy map.
   * If a key rotation policy is found, it is parsed and returned as an instance of `KeyRotationPolicy`.
   * If no key rotation policy is found, default key rotation policy are used.
   * @param keyRotationPolicyMap - The map containing the key rotation policy.
   * @param logContextIn - The log context to use.
   * @returns A new KeyRotationPolicy instance.
   * @throws {KmsError} If the key rotation policy cannot be parsed.
   */
  public static loadKeyRotationPolicyFromMap(
    keyRotationPolicyMap: ccfapp.KvMap,
    logContextIn: LogContext
  ): KeyRotationPolicy {
    const logContext = (logContextIn?.clone() || new LogContext()).appendScope(
      "loadKeyRotationPolicyFromMap"
    );

    // Load the key rotation from the map
    const key = "key_rotation_policy"; // Ensure the key matches the stored key in governance
    const keyBuf = ccf.strToBuf(key);

    const keyRotationPolicy = keyRotationPolicyMap.get(keyBuf);
    const keyRotationPolicyStr = keyRotationPolicy
      ? ccf.bufToStr(keyRotationPolicy)
      : undefined;
    Logger.debug(
      `Loading key rotation policy: ${keyRotationPolicyStr}`,
      logContext
    );

    let keyRotation: IKeyRotationPolicy;
    if (!keyRotationPolicyStr) {
      Logger.warn(
        `No key rotation policy found, using default key rotation policy`,
        logContext
      );
      keyRotation = KeyRotationPolicy.defaultKeyRotationPolicy();
    } else {
      try {
        keyRotation = JSON.parse(keyRotationPolicyStr) as IKeyRotationPolicy;
      } catch {
        const error = `Failed to parse key rotation policy: ${keyRotationPolicyStr}`;
        Logger.error(error, logContext);
        throw new KmsError(error, logContext);
      }
    }
    return new KeyRotationPolicy(keyRotation);
  }
}
