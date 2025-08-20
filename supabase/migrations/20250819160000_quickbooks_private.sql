-- QuickBooks private tables: oauth_states and quickbooks_connections

-- Table to store OAuth state tokens for CSRF protection (private)
CREATE TABLE IF NOT EXISTS private.oauth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state TEXT NOT NULL UNIQUE,
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index to cleanup expired states
CREATE INDEX IF NOT EXISTS idx_private_oauth_states_expires_at ON private.oauth_states(expires_at);

-- Table to store QuickBooks OAuth connection credentials (private)
CREATE TABLE IF NOT EXISTS private.quickbooks_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id TEXT NOT NULL UNIQUE,
    realm_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    is_sandbox BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Helper function for updated_at in private schema
CREATE OR REPLACE FUNCTION private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_quickbooks_connections_updated_at' 
        AND tgrelid = 'private.quickbooks_connections'::regclass
    ) THEN
        CREATE TRIGGER update_quickbooks_connections_updated_at 
        BEFORE UPDATE ON private.quickbooks_connections
        FOR EACH ROW EXECUTE FUNCTION private.update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE private.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.quickbooks_connections ENABLE ROW LEVEL SECURITY; 