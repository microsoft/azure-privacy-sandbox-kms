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
 * LogContext class to explicitly handle log context metadata like scope, requestId, etc.
 */
export class LogContext {
  public readonly isLogContext: boolean = true;
  scope?: string;
  requestId?: string;

  /**
   * Constructor to initialize LogContext with optional scope and requestId.
   * @param options - An object containing optional scope and requestId.
   */
  constructor(options?: { scope?: string; requestId?: string }) {
    if (options) {
      this.scope = options.scope;
      this.requestId = options.requestId;
    }
  }

  /**
   * Sets the scope of the LogContext.
   * @param scope - The scope name (e.g., function or module name).
   * @returns The current instance of LogContext for method chaining.
   */
  setScope(scope: string): LogContext {
    this.scope = scope;
    return this;
  }

  /**
   * Sets the requestId of the LogContext.
   * @param requestId - The unique identifier for the request.
   * @returns The current instance of LogContext for method chaining.
   */
  setRequestId(requestId: string): LogContext {
    this.requestId = requestId;
    return this;
  }
}

/**
 * The Logger class provides logging functionality for the application with different log levels.
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
   * Helper function to determine if the second argument is LogContext or arbitrary argument.
   * It returns a tuple [context, args], where:
   * - context is either a LogContext instance or undefined
   * - args is an array of additional arguments (with contextOrArg prepended if it's not a LogContext)
   */
  private static extractContextAndArgs(contextOrArg: any, args: any[]): [LogContext | undefined, any[]] {
    if (contextOrArg && (contextOrArg instanceof LogContext || contextOrArg.isLogContext)) {
      return [contextOrArg, args];
    } else {
      return [undefined, [contextOrArg, ...args]];
    }
  }

  /**
   * Formats log messages by appending LogContext fields like scope and requestId
   * in the form of key={value}.
   * @param context - LogContext object with optional fields like scope, requestId, etc.
   * @param message - The main log message.
   */
  private static formatMessageWithContext(context: LogContext | undefined, message: string): string {
    let formattedMessage = message;

    if (context) {
      const contextParts: string[] = [];
      if (context.scope) {
        contextParts.push(`scope=${context.scope}`);
      }
      if (context.requestId) {
        contextParts.push(`requestId=${context.requestId}`);
      }
      formattedMessage = `[${contextParts.join(',')}] ${formattedMessage}`;
    }

    return formattedMessage;
  }

  /**
   * Logs an error message to the console.
   * @param message - The error message to log.
   * @param contextOrArg - Optional LogContext object or arbitrary argument.
   * @param args - Additional arguments to be logged along with the error message.
   */
  static error(message: string, contextOrArg?: LogContext | any, ...args: any[]): boolean {
    const [context, remainingArgs] = this.extractContextAndArgs(contextOrArg, args);
    const formattedMessage = this.formatMessageWithContext(context, message);
    if (Logger.logLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${formattedMessage}`, ...remainingArgs);
      return true;
    }
    return false;
  }

  /**
   * Logs a warning message to the console.
   * @param message - The warning message to be logged.
   * @param contextOrArg - Optional LogContext object or arbitrary argument.
   * @param args - Additional arguments to be logged along with the warning message.
   */
  static warn(message: string, contextOrArg?: LogContext | any, ...args: any[]): boolean {
    const [context, remainingArgs] = this.extractContextAndArgs(contextOrArg, args);
    const formattedMessage = this.formatMessageWithContext(context, message);
    if (Logger.logLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${formattedMessage}`, ...remainingArgs);
      return true;
    }
    return false;
  }

  /**
   * Logs an informational message to the console.
   * @param message - The informational message to be logged.
   * @param contextOrArg - Optional LogContext object or arbitrary argument.
   * @param args - Additional arguments to be logged along with the informational message.
   */
  static info(message: string, contextOrArg?: LogContext | any, ...args: any[]): boolean {
    const [context, remainingArgs] = this.extractContextAndArgs(contextOrArg, args);
    const formattedMessage = this.formatMessageWithContext(context, message);
    if (Logger.logLevel >= LogLevel.INFO) {
      console.log(`[INFO] ${formattedMessage}`, ...remainingArgs);
      return true;
    }
    return false;
  }

  /**
   * Logs a debug message to the console.
   * @param message - The debug message to be logged.
   * @param contextOrArg - Optional LogContext object or arbitrary argument.
   * @param args - Additional arguments to be logged along with the debug message.
   */
  static debug(message: string, contextOrArg?: LogContext | any, ...args: any[]): boolean {
    const [context, remainingArgs] = this.extractContextAndArgs(contextOrArg, args);
    const formattedMessage = this.formatMessageWithContext(context, message);
    if (Logger.logLevel >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${formattedMessage}`, ...remainingArgs);
      return true;
    }
    return false;
  }

  /**
   * Logs a secret message to the debug output.
   * @param message - The secret message to log.
   * @param contextOrArg - Optional LogContext object or arbitrary argument.
   * @param args - Additional arguments to include in the log message.
   */
  static secret(message: string, contextOrArg?: LogContext | any, ...args: any[]): boolean {
    return this.debug(message, contextOrArg, ...args);
  }
}
