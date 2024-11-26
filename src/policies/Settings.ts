// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as ccfapp from "@microsoft/ccf-app";
import { ccf } from "@microsoft/ccf-app/global";
import { Logger, LogContext } from "../utils/Logger";
import { KmsError } from "../utils/KmsError";

export interface IService {
  name: string;
  description: string;
  version: string;
  debug: boolean;
}

// Define the ISettings interface
export interface ISettings {
  service: IService;
}

export class Settings {
  /**
   * Represents the settings for a policy.
   */
  constructor(public settings: ISettings) { }
  private static readonly logContext = new LogContext().appendScope("Settings");

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
    };
  }

  /**
   * Logs the settings of a service.
   * @param settings - The settings object containing service information.
   */
  public static logSettings(settings: ISettings): void {
    Logger.debug(`Service Name: ${settings.service.name}`, Settings.logContext);
    Logger.debug(`Service Description: ${settings.service.description}`, Settings.logContext);
    Logger.debug(`Service Version: ${settings.service.version}`, Settings.logContext);
  }

  /**
   * Loads the settings from the settings policy map.
   * If a settings policy is found, it is parsed and returned as an instance of `Settings`.
   * If no settings policy is found, default settings are used.
   * @returns An instance of `Settings` containing the loaded settings.
   * @throws Error if the settings policy map is not found or if there is an error parsing the settings policy.
   */
  public static loadSettingsFromMap(
    settingsPolicyMap: ccfapp.KvMap,
    logContextIn: LogContext,
  ): Settings {
    const logContext = logContextIn.appendScope("loadSettingsFromMap");

    Logger.info(`Loading settings from map: ${settingsPolicyMap === undefined ? "undefined" : JSON.stringify(settingsPolicyMap)}`, logContext);
    Logger.info(`Map size: ${settingsPolicyMap.size}`, logContext);

    // Load the settings from the map
    const key = "settings_policy"; // Ensure the key matches the stored key in governance
    const keyBuf = ccf.strToBuf(key);

    const settingsPolicy = settingsPolicyMap.get(keyBuf);
    const settingsPolicyStr = settingsPolicy ? ccf.bufToStr(settingsPolicy) : undefined;
    Logger.info(`Loading settings: ${settingsPolicyStr}`, logContext);


    let settings: ISettings;
    if (!settingsPolicyStr) {
      Logger.warn(`No settings policy found, using default settings`, logContext);
      settings = Settings.defaultSettings();
    } else {
      try {
        settings = JSON.parse(settingsPolicyStr) as ISettings;
      } catch {
        const error = `Failed to parse settings policy: ${settingsPolicyStr}`;
        Logger.error(error, logContext);
        throw new KmsError(error, logContext);
      }
    }
    return new Settings(settings);
  }
}
