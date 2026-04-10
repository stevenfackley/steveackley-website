/**
 * Structured logging utilities using Pino.
 * - Production: JSON output to stdout
 * - Development: pretty-printed output via pino-pretty
 *
 * Exports a typed `logger` with info/warn/error/debug methods
 * and a `withRequestId` helper that returns a child logger bound
 * to a specific requestId.
 */

import pino from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const baseLogger = pino(
  {
    level: isProduction ? "info" : "debug",
    base: { service: "steveackleyorg" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isProduction
    ? pino.destination(1) // stdout, JSON
    : (pino as any).transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      })
);

function formatTestLog(
  level: string,
  message: string,
  extra?: Record<string, unknown>
): string {
  const suffix = extra && Object.keys(extra).length
    ? " " + JSON.stringify(extra)
    : "";
  return `[${level}] ${message}${suffix}`;
}

/**
 * Application logger. Interface is compatible with the previous custom logger:
 *   debug(message, context?)
 *   info(message, context?)
 *   warn(message, context?)
 *   error(message, error?, context?)
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (isTest) { console.debug(formatTestLog("DEBUG", message, context)); return; }
    baseLogger.debug(context ?? {}, message);
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (isTest) { console.info(formatTestLog("INFO", message, context)); return; }
    baseLogger.info(context ?? {}, message);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (isTest) { console.warn(formatTestLog("WARN", message, context)); return; }
    baseLogger.warn(context ?? {}, message);
  },

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (isTest) {
      const extra: Record<string, unknown> = {
        ...(context ?? {}),
        ...(error ? { err: { name: error.name, message: error.message } } : {}),
      };
      console.error(formatTestLog("ERROR", message, Object.keys(extra).length ? extra : undefined));
      return;
    }
    baseLogger.error(
      {
        ...(context ?? {}),
        ...(error
          ? { err: { name: error.name, message: error.message, stack: error.stack } }
          : {}),
      },
      message
    );
  },
};

/**
 * Returns a child logger with `requestId` bound to every log line.
 * Use once per request, then pass the child logger down the call chain.
 */
export function withRequestId(requestId: string): typeof logger {
  const child = baseLogger.child({ requestId });

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      child.debug(context ?? {}, message);
    },
    info(message: string, context?: Record<string, unknown>): void {
      child.info(context ?? {}, message);
    },
    warn(message: string, context?: Record<string, unknown>): void {
      child.warn(context ?? {}, message);
    },
    error(
      message: string,
      error?: Error,
      context?: Record<string, unknown>
    ): void {
      child.error(
        {
          ...(context ?? {}),
          ...(error
            ? { err: { name: error.name, message: error.message, stack: error.stack } }
            : {}),
        },
        message
      );
    },
  };
}
