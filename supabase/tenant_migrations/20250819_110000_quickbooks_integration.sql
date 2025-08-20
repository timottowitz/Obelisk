-- QuickBooks Integration for Tenant Schema

-- Table to map internal cost types to QuickBooks accounts and classes (tenant-scoped)
CREATE TABLE IF NOT EXISTS {{schema_name}}.qb_account_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id TEXT NOT NULL,
    cost_type TEXT NOT NULL,
    qb_account_id TEXT,
    qb_account_name TEXT,
    qb_class_id TEXT,
    qb_class_name TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, cost_type)
);

-- Vendor reference table (tenant-scoped)
CREATE TABLE IF NOT EXISTS {{schema_name}}.qb_vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_name TEXT NOT NULL,
    qb_vendor_id TEXT,
    qb_display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_name)
);

-- Add QuickBooks customer reference fields to cases table (tenant-scoped)
ALTER TABLE {{schema_name}}.cases 
    ADD COLUMN IF NOT EXISTS qb_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS qb_sub_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS qb_sync_status TEXT DEFAULT 'not_synced' CHECK (qb_sync_status IN ('not_synced', 'synced', 'error')),
    ADD COLUMN IF NOT EXISTS qb_last_sync_at TIMESTAMPTZ;

-- Extend existing case_expenses with QuickBooks sync fields (tenant-scoped)
ALTER TABLE {{schema_name}}.case_expenses 
    ADD COLUMN IF NOT EXISTS qb_entity_type TEXT CHECK (qb_entity_type IN ('Purchase', 'Bill', 'Invoice', 'Expense')),
    ADD COLUMN IF NOT EXISTS qb_id TEXT,
    ADD COLUMN IF NOT EXISTS qb_sync_error TEXT,
    ADD COLUMN IF NOT EXISTS qb_last_sync_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS qb_sync_status TEXT DEFAULT 'not_synced' CHECK (qb_sync_status IN ('not_synced', 'synced', 'error'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_case_expenses_qb_sync_status ON {{schema_name}}.case_expenses(qb_sync_status);
CREATE INDEX IF NOT EXISTS idx_case_expenses_qb_last_sync_at ON {{schema_name}}.case_expenses(qb_last_sync_at);
CREATE INDEX IF NOT EXISTS idx_cases_qb_sync_status ON {{schema_name}}.cases(qb_sync_status);

-- Enable RLS on new tenant tables
ALTER TABLE {{schema_name}}.qb_account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.qb_vendors ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger helper (tenant-scoped)
CREATE OR REPLACE FUNCTION {{schema_name}}.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for new tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_qb_account_mappings_updated_at' 
        AND tgrelid = '{{schema_name}}.qb_account_mappings'::regclass
    ) THEN
        CREATE TRIGGER update_qb_account_mappings_updated_at 
        BEFORE UPDATE ON {{schema_name}}.qb_account_mappings
        FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_qb_vendors_updated_at' 
        AND tgrelid = '{{schema_name}}.qb_vendors'::regclass
    ) THEN
        CREATE TRIGGER update_qb_vendors_updated_at 
        BEFORE UPDATE ON {{schema_name}}.qb_vendors
        FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at_column();
    END IF;
END $$;