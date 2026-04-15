/**
 * Unit tests for src/lib/logger.ts
 * Tests the structured logging utilities.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  describe("debug", () => {
    it("logs a debug message", () => {
      logger.debug("Test debug message");
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it("includes context in debug log", () => {
      logger.debug("Test debug", { key: "value" });
      expect(consoleDebugSpy).toHaveBeenCalled();
      const logOutput = consoleDebugSpy.mock.calls[0][0];
      expect(logOutput).toContain("Test debug");
      expect(logOutput).toContain("key");
    });
  });

  describe("info", () => {
    it("logs an info message", () => {
      logger.info("Test info message");
      expect(console.info).toHaveBeenCalled();
    });

    it("includes timestamp in info log", () => {
      logger.info("Test info");
      const logOutput = (console.info as any).mock.calls[0][0];
      expect(logOutput).toContain("[INFO]");
    });
  });

  describe("warn", () => {
    it("logs a warning message", () => {
      logger.warn("Test warning");
      expect(console.warn).toHaveBeenCalled();
    });

    it("includes context in warning log", () => {
      logger.warn("Warning occurred", { code: 404 });
      const logOutput = (console.warn as any).mock.calls[0][0];
      expect(logOutput).toContain("Warning occurred");
      expect(logOutput).toContain("404");
    });
  });

  describe("error", () => {
    it("logs an error message", () => {
      logger.error("Test error");
      expect(console.error).toHaveBeenCalled();
    });

    it("includes error object details", () => {
      const testError = new Error("Something went wrong");
      logger.error("Operation failed", testError);
      const logOutput = (console.error as any).mock.calls[0][0];
      expect(logOutput).toContain("Operation failed");
      expect(logOutput).toContain("Something went wrong");
    });

    it("includes context alongside error", () => {
      const testError = new Error("DB connection failed");
      logger.error("Database error", testError, { host: "localhost", port: 5432 });
      const logOutput = (console.error as any).mock.calls[0][0];
      expect(logOutput).toContain("Database error");
      expect(logOutput).toContain("localhost");
    });
  });
});
