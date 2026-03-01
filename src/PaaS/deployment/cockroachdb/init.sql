-- ──────────────────────────────────────────────────────────────────────────────
-- CockroachDB Multi-Tenant Schema Initialization
-- Executed on first cluster bootstrap
-- ──────────────────────────────────────────────────────────────────────────────

-- Create main application database
CREATE DATABASE IF NOT EXISTS hybrid_platform;

-- Create application user with restricted permissions
CREATE USER IF NOT EXISTS hybrid_user WITH PASSWORD '${COCKROACH_PASSWORD}';
GRANT ALL ON DATABASE hybrid_platform TO hybrid_user;

-- Switch to application database
USE hybrid_platform;

-- ──────────────────────────────────────────────────────────────────────────────
-- Tenant Schema Management Functions
-- ──────────────────────────────────────────────────────────────────────────────

-- Function: Provision a new tenant schema
-- Called by admin API when onboarding new tenants
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_id TEXT)
RETURNS TABLE (schema_name TEXT, created_at TIMESTAMPTZ) AS $$
DECLARE
    schema_name_var TEXT;
BEGIN
    schema_name_var := 'tenant_' || tenant_id;
    
    -- Create schema if it doesn't exist
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name_var);
    
    -- Grant permissions to application user
    EXECUTE format('GRANT ALL ON SCHEMA %I TO hybrid_user', schema_name_var);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO hybrid_user', schema_name_var);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO hybrid_user', schema_name_var);
    
    -- Return result
    RETURN QUERY SELECT schema_name_var, now();
END;
$$ LANGUAGE plpgsql;

-- Function: Drop tenant schema (hard delete for offboarding)
-- DANGER: This permanently deletes all tenant data
CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_id TEXT)
RETURNS TABLE (schema_name TEXT, dropped_at TIMESTAMPTZ) AS $$
DECLARE
    schema_name_var TEXT;
BEGIN
    schema_name_var := 'tenant_' || tenant_id;
    
    -- Cascade drop all objects in the schema
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name_var);
    
    -- Return result
    RETURN QUERY SELECT schema_name_var, now();
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────────
-- Global System Tables (public schema)
-- ──────────────────────────────────────────────────────────────────────────────

-- Tenant registry table (tracks all provisioned tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
    tenant_id TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL,
    schema_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    CONSTRAINT valid_tenant_id CHECK (tenant_id ~ '^[a-zA-Z0-9_-]{1,64}$')
);

-- Audit log table (global security event tracking)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(tenant_id) ON DELETE SET NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- Performance Optimization: Zone Configuration
-- ──────────────────────────────────────────────────────────────────────────────

-- Configure replication factor for high availability
-- In multi-region: Configure zone constraints per table based on data residency requirements
ALTER DATABASE hybrid_platform CONFIGURE ZONE USING num_replicas = 3, gc.ttlseconds = 86400;

-- Configure public schema tables for global distribution
ALTER TABLE public.tenants CONFIGURE ZONE USING num_replicas = 5;
ALTER TABLE public.audit_log CONFIGURE ZONE USING num_replicas = 3, gc.ttlseconds = 2592000;  -- 30 day retention

-- ──────────────────────────────────────────────────────────────────────────────
-- Sample Tenant Provisioning (for testing)
-- ──────────────────────────────────────────────────────────────────────────────

-- Provision demo tenant
INSERT INTO public.tenants (tenant_id, organization_name, schema_name, metadata)
VALUES ('demo', 'Demo Organization', 'tenant_demo', '{"tier": "trial", "max_users": 10}')
ON CONFLICT (tenant_id) DO NOTHING;

SELECT * FROM create_tenant_schema('demo');

-- Grant permissions
GRANT USAGE ON SCHEMA tenant_demo TO hybrid_user;
GRANT ALL ON ALL TABLES IN SCHEMA tenant_demo TO hybrid_user;
