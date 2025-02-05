import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { IKeyRotationPolicy } from "./IKeyRotationPolicy";
import { Logger, LogContext } from "../utils/Logger";
import { KmsError } from "../utils/KmsError";
import { IKeyItem } from "../endpoints/IKeyItem";
import { enableEndpoint } from "../utils/Tooling";


// Enable the endpoint
enableEndpoint();
/**
 * Interface representing the expiry times.
 */
export interface IExpiryTimes {
  expiryTimeMs: number;
  expiryTimeAndGraceMs: number;
}

/**
 * Class representing a Key Rotation Policy.
 */
export class KeyRotationPolicy {
  /**
   * Constructs a new KeyRotationPolicy instance.
   * @param keyRotationPolicy - The key rotation policy settings.
   */
  constructor(public keyRotationPolicy: IKeyRotationPolicy) { }

  /**
   * The log context for the KeyRotationPolicy class.
   * @private
   */
  private static readonly logContext = new LogContext().appendScope(
    "KeyRotationPolicy"
  );

  /**
   * Logs the key rotation policy settings.
   * @param keyRotationPolicy - The key rotation policy to log.
   */
  public static logKeyRotationPolicy(
    keyRotationPolicy: IKeyRotationPolicy
  ): void {
    Logger.debug(
      `Rotation Interval Seconds: ${keyRotationPolicy.grace_period_seconds}`,
      KeyRotationPolicy.logContext
    );
    Logger.debug(
      `Grace Period Seconds: ${keyRotationPolicy.grace_period_seconds}`,
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
  public static getKeyRotationPolicyFromMap(
    keyRotationPolicyMap: ccfapp.KvMap,
    logContextIn: LogContext
  ): IKeyRotationPolicy | undefined {
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
      Logger.info(
        `No key rotation policy found`,
        logContext
      );
      return undefined;
    } else {
      try {
        keyRotation = JSON.parse(keyRotationPolicyStr) as IKeyRotationPolicy;
      } catch {
        const error = `Failed to parse key rotation policy: ${keyRotationPolicyStr}`;
        Logger.error(error, logContext);
        throw new KmsError(error, logContext);
      }
    }
    return keyRotation;
  }

  /**
   *
   * @param keyRotationPolicyMap  - The map containing the key rotation policy.
   * @param keyItemCreationTime - The creation time of the key item in milliseconds.
   * @param logContextIn  - The log context to use.
   * @returns [expired, deprecated] - A tuple containing two number values. The first value indicates the key expiring time, and the second value indicates if the key deprecation time.
   */
  public static getKeyItemExpiryTime(
    keyRotationPolicyMap: ccfapp.KvMap,
    keyItemCreationTime: number,
    logContextIn: LogContext): IExpiryTimes | undefined {

    const keyRotation = KeyRotationPolicy.getKeyRotationPolicyFromMap(
      keyRotationPolicyMap,
      logContextIn
    );

    if (keyRotation !== undefined) {
      const gracePeriodSeconds = keyRotation.grace_period_seconds;
      const rotationIntervalSeconds = keyRotation.rotation_interval_seconds;
      Logger.info(`Key rotation policy content: ${JSON.stringify(keyRotation)}`, logContextIn);

      // Get the current time using TrustedTime
      const currentTime = Date.now();

      // Get the creation time of the key
      const creationTimeMs = keyItemCreationTime;

      // Calculate the expiry time of the key by adding the rotation interval to the creation date
      const expiryTimeMs = creationTimeMs + (rotationIntervalSeconds * 1000);
      const expiryTimeAndGraceMs = expiryTimeMs + (gracePeriodSeconds * 1000);

      Logger.info(`Key rotation policy Creation time: ${new Date(creationTimeMs)}, Current Time: ${new Date(currentTime)}, delta (ms): ${currentTime - creationTimeMs}, expiryTimeMs (${expiryTimeMs}): ${new Date(expiryTimeMs)}, expiryTimeAndGraceMs (${expiryTimeAndGraceMs}): ${new Date(expiryTimeAndGraceMs)}`);
      return {expiryTimeMs, expiryTimeAndGraceMs};
    } else {
      Logger.info(`Key rotation policy is not defined, cannot calculate expiry time`, logContextIn);
      return undefined;
    }
  }

  /**
   *
   * @param keyRotationPolicyMap  - The map containing the key rotation policy.
   * @param keyItem - The key item to check.
   * @param logContextIn  - The log context to use.
   * @returns [expired, deprecated] - A tuple containing two boolean values. The first value indicates if the key has expired, and the second value indicates if the key is deprecated.
   */
  public static isExpired(
    keyRotationPolicyMap: ccfapp.KvMap,
    keyItem: IKeyItem,
    logContextIn: LogContext): [boolean, boolean] {

    const currentTimeMs = Date.now();
    const expiryTimes = KeyRotationPolicy.getKeyItemExpiryTime(keyRotationPolicyMap, keyItem.timestamp!, logContextIn);

    // check if key rotation policy is defined
    if (!expiryTimes) {
      return [false, false];
    }

    if (currentTimeMs > expiryTimes.expiryTimeMs) {
      Logger.warn(`Key has expired and is no longer valid`, logContextIn);
      return [true, true];
    } else if (currentTimeMs > expiryTimes.expiryTimeAndGraceMs) {
      Logger.warn(`Key is deprecated and will expire soon`, logContextIn);
      return [false, true];
    }
    return [false, false];
  }
}
