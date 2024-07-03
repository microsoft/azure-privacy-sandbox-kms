// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { Logger, LogLevel } from "../../../src/utils/Logger";

describe("Logger", () => {
  beforeEach(() => {
    // Mock console functions
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    // Reset mocks before each test
    jest.resetAllMocks();

    // Reset the log level before each test
    Logger.setLogLevel(LogLevel.INFO);
  });

  test("should log an error message if log level is equal or higher", () => {
    // Arrange
    Logger.setLogLevel(LogLevel.ERROR);
    const errorMessage = "This is an error message";

    // Act
    const result = Logger.error(errorMessage);

    // Assert
    expect(console.error).toHaveBeenCalledWith("[ERROR] " + errorMessage);
    expect(result).toBe(true);
  });

  test("should log a warning message if log level is equal or higher", () => {
    // Arrange
    Logger.setLogLevel(LogLevel.WARN);
    const errorMessage = "This is an warn message";

    // Act
    const result = Logger.warn(errorMessage);

    // Assert
    expect(console.warn).toHaveBeenCalledWith("[WARN] " + errorMessage);
    expect(result).toBe(true);
  });

  test("should fail to log a warning message if log level is equal or higher", () => {
    // Arrange
    Logger.setLogLevel(LogLevel.ERROR);
    const errorMessage = "This is an warn message";

    // Act
    const result = Logger.warn(errorMessage);

    // Assert
    expect(result).toBe(false);
  });
});
