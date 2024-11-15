// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { Logger, LogLevel, LogContext } from "../../../src/utils/Logger";

describe("Logger", () => {
  beforeEach(() => {
    // Mock console functions
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "warn").mockImplementation(() => { });

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

describe("LogContext", () => {
  test("should convert LogContext to string correctly", () => {
    const context = new LogContext();
    context.appendScope("Scope1").setRequestId("12345");

    expect(context.toString()).toBe("[requestId=12345,scope=Scope1]");
  });

  test("should append and pop scopes correctly", () => {
    const context = new LogContext();

    context.appendScope("Scope1").appendScope("Scope2");
    expect(context.getFormattedScopeString()).toBe("Scope1->Scope2");
    expect(context.toString()).toBe("[scope=Scope1->Scope2]");

    context.popScope();
    expect(context.getFormattedScopeString()).toBe("Scope1");
    expect(context.toString()).toBe("[scope=Scope1]");
  });

  test("should set and get requestId correctly", () => {
    const context = new LogContext();
    context.setRequestId("12345");

    expect(context.requestId).toBe("12345");
    expect(context.toString()).toBe("[requestId=12345,scope=]");
  });

  test("should clear scope and requestId", () => {
    const context = new LogContext();
    context.appendScope("Scope1").setRequestId("12345");
    context.clear();

    expect(context.getFormattedScopeString()).toBe("");
    expect(context.requestId).toBeUndefined();
  });

  test("should get the base scope correctly", () => {
    const context = new LogContext();
    context.appendScope("Scope1").appendScope("Scope2");
    expect(context.getBaseScope()).toBe("Scope1");

    context.popScope();
    expect(context.getBaseScope()).toBe("Scope1");

    context.popScope();
    expect(context.getBaseScope()).toBeUndefined();
  });

  test("should clone LogContext correctly", () => {
    const context = new LogContext();
    context.appendScope("Scope1").setRequestId("12345");

    // Cloned context should have the same scope and requestId
    const clonedContext = context.clone();
    expect(clonedContext.getFormattedScopeString()).toBe("Scope1");
    expect(clonedContext.requestId).toBe("12345");
    expect(clonedContext.toString()).toBe(context.toString());

    // Modifying the cloned context should not affect the original context
    clonedContext.appendScope("Scope2").setRequestId("67890");
    expect(clonedContext.toString()).toBe("[requestId=67890,scope=Scope1->Scope2]");
    expect(context.getFormattedScopeString()).toBe("Scope1");
    expect(context.requestId).toBe("12345");
    expect(context.toString()).toBe("[requestId=12345,scope=Scope1]");
  });
});