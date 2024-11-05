// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ccf } from "@microsoft/ccf-app/global";
import { Logger } from "../utils/Logger";

export interface IService {
  name: string;
  description: string;
  version: string;
  debug: boolean;
}

export interface IKeyRotation {
  gracePeriodDays: number;
  ttlDays: number;
}


// Define the ISettings interface
export interface ISettings {
  service: IService;
  keyRotation: IKeyRotation;
}

export class Settings {
  /**
   * Represents the settings for a policy.
   */
  constructor(public settings: ISettings) {}

  /**
   * Returns the default settings for the Key Management Service.
   * @returns The default settings object.
   */
  public static defaultSettings(): ISettings {
    return {
      service: {
        name: "azure-privacy-sandbox-kms",
        description: "Key Management Service",
        version: "1.0.0",
        debug: false,
      },
      keyRotation: {
        gracePeriodDays: 2,
        ttlDays: 7,
      },
    };
  }

  /**
   * Logs the settings of a service.
   * @param settings - The settings object containing service information.
   */
  public static logSettings(settings: ISettings): void {
    Logger.debug(`Service Name: ${settings.service.name}`);
    Logger.debug(`Service Description: ${settings.service.description}`);
    Logger.debug(`Service Version: ${settings.service.version}`);
  }

  /**
   * Loads the settings from the settings policy map.
   * If a settings policy is found, it is parsed and returned as an instance of `Settings`.
   * If no settings policy is found, default settings are used.
   * @returns An instance of `Settings` containing the loaded settings.
   * @throws Error if the settings policy map is not found or if there is an error parsing the settings policy.
   */
  public static loadSettings(): Settings {
    // Load the settings from the map
    const settingsPolicyMapName = "public:ccf.gov.policies.settings";
    const key = "settings_policy";
    const keyBuf = ccf.strToBuf(key);

    const settingsPolicyMap = ccf.kv[settingsPolicyMapName];
    if (!settingsPolicyMap) {
      const error = `Settings policy map not found: ${settingsPolicyMapName}`;
      Logger.error(error);
      throw new Error(error);
    }

    const settingsPolicy = settingsPolicyMap.get(keyBuf);
    let settings: ISettings;
    if (!settingsPolicy) {
      settings = Settings.defaultSettings();
    } else {
      Logger.info(`No settings policy found, using default settings`);
      try {
        settings = JSON.parse(ccf.bufToStr(settingsPolicy)) as ISettings;
      } catch {
        const error = `Failed to parse settings policy: ${ccf.bufToStr(settingsPolicy)}`;
        Logger.error(error);
        throw new Error(error);
      }
    }

    return new Settings(settings);
  }
}
