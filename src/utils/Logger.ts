// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Settings } from "../policies/Settings";

// Logging levels enum
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * The Logger class provides logging functionality with different log levels.
 */
/**
 * The Logger class provides logging functionality for the application.
 */
export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;

  /**
   * Sets the log level for the logger.
   * @param level - The log level to set.
   */
  static setLogLevel(level: LogLevel): void {
    // Convert the numeric enum value to its corresponding string key
    const levelKey = LogLevel[level];
    console.log(
      `Setting log level (${LogLevel[Logger.logLevel]}) to ${levelKey}`,
    );
    Logger.logLevel = level;
  }

  static setLogLevelFromSettings(settings: Settings): void {
    if (settings.settings.service.debug) {
      Logger.setLogLevel(LogLevel.DEBUG);
    }
  }

  /**
   * Logs an error message to the console.
   *
   * @param message - The error message to log.
   * @param args - Additional arguments to be logged along with the error message.
   * @returns `true` if the error message was logged, `false` otherwise.
   */
  static error(message: string, ...args: any[]): boolean {
    if (Logger.logLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
      return true;
    }
    return false;
  }

  /**
   * Logs a warning message to the console.
   * @param message - The warning message to be logged.
   * @param args - Additional arguments to be logged along with the message.
   */
  static warn(message: string, ...args: any[]): boolean {
    if (Logger.logLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
      return true;
    }
    return false;
  }

  /**
   * Logs an informational message to the console.
   *
   * @param message - The message to be logged.
   * @param args - Additional arguments to be logged along with the message.
   */
  static info(message: string, ...args: any[]): boolean {
    if (Logger.logLevel >= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
      return true;
    }
    return false;
  }

  /**
   * Logs a debug message to the console.
   *
   * @param message - The debug message to log.
   * @param args - Additional arguments to be logged along with the message.
   */
  static debug(message: string, ...args: any[]): boolean {
    if (Logger.logLevel >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
      return true;
    }
    return false;
  }

  /**
   * Logs a secret message to the debug output.
   * @param message - The secret message to log.
   * @param args - Additional arguments to include in the log message.
   */
  static secret(message: string, ...args: any[]): boolean {
    return this.debug(message, ...args);
  }
}
