-- TimescaleDB Setup for Edge Telemetry (PostgreSQL extension)
-- Assuming TimescaleDB extension is installed in the cluster

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create hypertable for TelemetryMetrics
CREATE TABLE IF NOT EXISTS "TelemetryMetrics" (
    "Id" BIGSERIAL,
    "TenantId" VARCHAR(255) NOT NULL,
    "DeviceId" UUID NOT NULL,
    "Timestamp" TIMESTAMPTZ NOT NULL,
    "TotalSessions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "AvgSessionDurationSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "SyncCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CrashCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "P2pConnections" DOUBLE PRECISION NOT NULL DEFAULT 0,
    PRIMARY KEY ("Id", "Timestamp")
);

-- Convert standard table to TimescaleDB hypertable partitioned by Timestamp
SELECT create_hypertable('"TelemetryMetrics"', 'Timestamp', if_not_exists => TRUE);

-- Create a continuous aggregate for hourly telemetry dashboard (AIOps support)
CREATE MATERIALIZED VIEW IF NOT EXISTS "Telemetry_Hourly"
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', "Timestamp") AS "Bucket",
       "TenantId",
       COUNT(DISTINCT "DeviceId") AS "ActiveDevices",
       SUM("TotalSessions") AS "HourlySessions",
       AVG("AvgSessionDurationSec") AS "HourlyAvgDuration",
       SUM("SyncCount") AS "HourlySyncs",
       SUM("CrashCount") AS "HourlyCrashes",
       AVG("P2pConnections") AS "HourlyAvgP2p"
FROM "TelemetryMetrics"
GROUP BY "Bucket", "TenantId";

-- Add data retention policy (keep raw data for 30 days)
SELECT add_retention_policy('"TelemetryMetrics"', INTERVAL '30 days');

-- Create indexes for efficient querying by TenantId and DeviceId
CREATE INDEX IF NOT EXISTS "IX_TelemetryMetrics_TenantId_Timestamp" ON "TelemetryMetrics" ("TenantId", "Timestamp" DESC);
CREATE INDEX IF NOT EXISTS "IX_TelemetryMetrics_DeviceId_Timestamp" ON "TelemetryMetrics" ("DeviceId", "Timestamp" DESC);
