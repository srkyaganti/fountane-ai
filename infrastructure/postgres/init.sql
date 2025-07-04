-- Create databases for different services
CREATE DATABASE keycloak;
CREATE DATABASE n8n;
CREATE DATABASE unleash;
CREATE DATABASE lago;

-- Create schema for multi-tenancy
CREATE SCHEMA IF NOT EXISTS tenants;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security setup
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create base RLS policy
CREATE POLICY tenant_isolation_policy ON audit_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE keycloak TO fountane;
GRANT ALL PRIVILEGES ON DATABASE n8n TO fountane;
GRANT ALL PRIVILEGES ON DATABASE unleash TO fountane;
GRANT ALL PRIVILEGES ON DATABASE lago TO fountane;