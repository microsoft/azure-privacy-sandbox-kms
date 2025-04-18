// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import { describe, expect, jest, test } from "@jest/globals";
import { ISettings, Settings } from "../../../src/policies/Settings";
import { LogContext, Logger, LogLevel } from "../../../src/utils/Logger";

describe("Test Settings Policy properties", () => {

  test("Should get all data successfully", () => {
    // Arrange
    const settings = Settings.defaultSettings();

    // Act

    // Assert
    expect(settings.service.debug).toEqual(false);
    expect(settings.service.description).toContain("Key Management Service");
    expect(settings.service.name).toContain("azure-privacy-sandbox-kms");
    expect(settings.service.version).toContain("1.0.0");
  });

  test("Should log settings correctly=> log is called", () => {
    // Arrange
    const settings = Settings.defaultSettings();
    settings.service.debug = true;
    Logger.setLogLevel(LogLevel.DEBUG);

    // Mock Logger.debug
    const debugSpy = jest.spyOn(console, "log").mockImplementation(() => true);

    // Act
    Settings.logSettings(settings);

    // Assert
    expect(debugSpy).toHaveBeenCalledWith(
      `[DEBUG] [scope=Settings] Service Name: ${settings.service.name}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[DEBUG] [scope=Settings] Service Description: ${settings.service.description}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[DEBUG] [scope=Settings] Service Version: ${settings.service.version}`,
    );
    expect(debugSpy).toHaveBeenCalledWith(
      `[DEBUG] [scope=Settings] Debug: ${settings.service.debug}`,
    );

    // Clean up
    debugSpy.mockRestore();
  });

  test("Should log settings correctly=> log is not called", () => {
    // Arrange
    const settings = Settings.defaultSettings();
    settings.service.debug = false;
    Logger.setLogLevel(LogLevel.INFO);

    // Mock Logger.debug
    const debugSpy = jest.spyOn(console, "log").mockImplementation(() => true);

    // Act
    Settings.logSettings(settings);

    // Assert
    expect(debugSpy).toHaveBeenCalledTimes(0);

    // Clean up
    debugSpy.mockRestore();
  });

  test("Should load settings from map successfully", () => {
    // Arrange
    const settingsPolicyMap = globalThis.ccf.kv["public:policies.settings"];
    settingsPolicyMap.clear();
    const settingsPolicyValue = globalThis.ccf.strToBuf(JSON.stringify({
      service: {
        name: "azure-privacy-sandbox-kms",
        description: "Key Management Service",
        version: "10.0.0",
        debug: true
      }
    }));
    settingsPolicyMap.set("settings_policy", settingsPolicyValue);

    // Act
    const settings = Settings.loadSettingsFromMap(settingsPolicyMap, new LogContext().appendScope("loadSettingsFromMap")).settings as ISettings;

    // Assert
    expect(settings.service.name).toBe("azure-privacy-sandbox-kms");
    expect(settings.service.description).toBe("Key Management Service");
    expect(settings.service.version).toBe("10.0.0");
    expect(settings.service.debug).toBe(true);
  });

  test("Should load default settings when settings are found on map successfully", () => {
    // Arrange
    const settingsPolicyMap = globalThis.ccf.kv["public:policies.settings"];
    settingsPolicyMap.clear();

    const settingsPolicyValue = globalThis.ccf.strToBuf(JSON.stringify({
      service: {
        name: "azure-privacy-sandbox-kms",
        description: "Key Management Service",
        version: "10.0.0",
        debug: false
      }
    }));
    settingsPolicyMap.set("dummy", settingsPolicyValue);

    // Act
    const settings = Settings.loadSettingsFromMap(settingsPolicyMap, new LogContext().appendScope("loadSettingsFromMap")).settings as ISettings;

    // Assert
    expect(settings.service.name).toBe("azure-privacy-sandbox-kms");
    expect(settings.service.description).toBe("Key Management Service");
    expect(settings.service.version).toBe("1.0.0");
    expect(settings.service.debug).toBe(false);
  });
});
