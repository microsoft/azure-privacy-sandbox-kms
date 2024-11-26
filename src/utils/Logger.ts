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
  scopeStack: string[] = [];
  requestId?: string;

  /**
   * Constructor to initialize a new instance of the LogContext class.
   */
  constructor() { }

  /**
   * Sets the scope of the LogContext.
   * @param scope - The scope name (e.g., function or module name).
   * @returns The current instance of LogContext for method chaining.
   */
  appendScope(scope: string): LogContext {
    this.scopeStack.push(scope);
    return this;
  }

  /**
   * Removes the last scope from the scope stack.
   * @returns The current instance of LogContext for method chaining.
   */
  popScope(): LogContext {
    this.scopeStack.pop();
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

  /**
   * Gets the base (bottom) scope from the scope stack.
   * @returns The base scope from the scope stack.
   */
  getBaseScope(): string | undefined {
    return this.scopeStack.length > 0 ? this.scopeStack[0] : undefined;
  }

  /**
   * Gets the formatted current scope string from the scope stack.
   * @returns The formatted current scope string from the scope stack.
   */
  getFormattedScopeString(): string {
    return this.scopeStack.join('->');
  }

  /**
   * Clears the scope stack and request ID.
   */
  clear(): void {
    this.scopeStack = [];
    this.requestId = undefined;
  }

  /**
   * Clones the current LogContext instance.
   * @returns A new instance of LogContext with the same scope stack and request ID as the current instance.
   */
  clone(): LogContext {
    const clone = new LogContext();
    clone.scopeStack = [...this.scopeStack];
    if (this.requestId) {
      clone.setRequestId(this.requestId);
    }
    return clone;
  }

  /**
   * Returns a string representation of the LogContext instance.
   * @returns A string representation of the LogContext instance.
   */
  public toString(): string {
    const contextParts: string[] = [];
    if (this.requestId) {
      contextParts.push(`requestId=${this.requestId}`);
    }
    if (this.scopeStack) {
      contextParts.push(`scope=${this.getFormattedScopeString()}`);
    }
    return `[${contextParts.join(',')}]`;
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
  private static extractContextAndArgs(contextOrArg?: LogContext | any, args: any[] = []): [LogContext | undefined, any[]] {
    if (contextOrArg instanceof LogContext) {
      return [contextOrArg, args];
    }
    return [undefined, [contextOrArg, ...args]];
  }

  /**
   * Formats log messages by appending LogContext fields like scope and requestId
   * in the form of key={value}.
   * @param context - LogContext object with optional fields like scope, requestId, etc.
   * @param message - The main log message.
   */
  private static formatMessageWithContext(context: LogContext | undefined, message: string): string {
    if (context) {
      return `[${context.toString()}] ${message}`;
    }
    return message;
  }

  static getRemainingArgsString(remainingArgs: any[]): string {
    return remainingArgs
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg))
      .join(' ');
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
      const remainingArgsString = this.getRemainingArgsString(remainingArgs);
      if (remainingArgsString) {
          console.error(`[ERROR] ${formattedMessage} ${remainingArgsString}`);
      } else {
          console.error(`[ERROR] ${formattedMessage}`);
      }
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
      const remainingArgsString = this.getRemainingArgsString(remainingArgs);
      if (remainingArgsString) {
        console.warn(`[WARN] ${formattedMessage} ${remainingArgsString}`);
      } else {
        console.warn(`[WARN] ${formattedMessage}`);
      }
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
      const remainingArgsString = this.getRemainingArgsString(remainingArgs);
      if (remainingArgsString) {
          console.log(`[INFO] ${formattedMessage} ${remainingArgsString}`);
      } else {
          console.log(`[INFO] ${formattedMessage}`);
      }
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
      const remainingArgsString = this.getRemainingArgsString(remainingArgs);
      if (remainingArgsString) {
        console.log(`[DEBUG] ${formattedMessage} ${remainingArgsString}`);
    } else {
        console.log(`[DEBUG] ${formattedMessage}`);
    }
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
