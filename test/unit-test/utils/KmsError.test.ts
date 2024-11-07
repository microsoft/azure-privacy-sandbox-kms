// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { describe, expect, test } from "@jest/globals";
import { KmsError } from "../../../src/utils/KmsError";
import { LogContext } from "../../../src/utils/Logger";

describe("KmsError", () => {
  test("should create an error with a message only", () => {
    // Arrange
    const errorMessage = "This is a KmsError message";

    // Act
    const error = new KmsError(errorMessage);

    // Assert
    expect(error.message).toBe(errorMessage);
    expect(error.logContext).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
  });

  test("should create an error with a message and log context", () => {
    // Arrange
    const errorMessage = "This is a KmsError message";
    const logContext = new LogContext();
    logContext.setRequestId("12345").appendScope("TestScope");

    // Act
    const error = new KmsError(errorMessage, logContext);

    // Assert
    const expectedMessage = `[requestId=12345,scope=TestScope] ${errorMessage}`;
    expect(error.message).toBe(expectedMessage);
    expect(error.logContext).toBe(logContext);
    expect(error).toBeInstanceOf(Error);
  });

  test("should handle empty log context gracefully", () => {
    // Arrange
    const errorMessage = "This is a KmsError message";
    const logContext = new LogContext();

    // Act
    const error = new KmsError(errorMessage, logContext);

    // Assert
    const expectedMessage = `[scope=] ${errorMessage}`;
    expect(error.message).toBe(expectedMessage);
    expect(error.logContext).toBe(logContext);
  });
});
