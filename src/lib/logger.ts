/**
 * Structured logging utilities for the application.
 * Provides consistent log formatting across all modules.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  const parts: string[] = [];
  
  if (entry.error) {
    parts.push(`Error: ${entry.error.message}`);
  }
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }
  
  if (parts.length > 0) {
    return `${base} | ${parts.join(" | ")}`;
  }
  return base;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "production") return;
    console.debug(formatLog(createLogEntry("debug", message, context)));
  },

  info(message: string, context?: Record<string, unknown>): void {
    console.info(formatLog(createLogEntry("info", message, context)));
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatLog(createLogEntry("warn", message, context)));
  },

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    console.error(
      formatLog(createLogEntry("error", message, context, error))
    );
  },
};
