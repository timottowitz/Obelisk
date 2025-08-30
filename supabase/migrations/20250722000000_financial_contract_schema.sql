-- 20250722000000_financial_contract_schema.sql
-- Financial contract management schema for tenant organizations

-- Store this migration in the tenant_migration_files table
INSERT INTO public.tenant_migration_files (filename, version, sql)
VALUES ('financial_contract_schema.sql', '1.0.0', $$

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data integrity
CREATE TYPE loan_status AS ENUM ('draft', 'pending', 'active', 'completed', 'defaulted', 'cancelled');
CREATE TYPE payment_method AS ENUM ('standard', 'ach', 'credit_card', 'wire_transfer');
CREATE TYPE payment_status AS ENUM ('scheduled', 'pending', 'completed', 'failed', 'cancelled');
CREATE TYPE case_status AS ENUM ('open', 'in_progress', 'on_hold', 'closed', 'archived');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'cancelled');
CREATE TYPE document_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');
CREATE TYPE contract_entity_type AS ENUM ('party', 'property', 'financial_term', 'clause', 'date', 'obligation');

-- Lenders table
CREATE TABLE lenders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_name text NOT NULL,
    legal_name text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip_code text,
    country text DEFAULT 'USA',
    phone text,
    email text,
    tax_id text,
    license_number text,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_lenders_name ON lenders(lender_name);
CREATE INDEX idx_lenders_active ON lenders(is_active);

-- Contractors table
CREATE TABLE contractors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_name text NOT NULL,
    legal_name text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip_code text,
    country text DEFAULT 'USA',
    phone text,
    email text,
    tax_id text,
    license_number text,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_contractors_name ON contractors(contractor_name);
CREATE INDEX idx_contractors_active ON contractors(is_active);

-- Properties table
CREATE TABLE properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    country text DEFAULT 'USA',
    property_type text,
    parcel_number text,
    legal_description text,
    square_footage numeric,
    year_built integer,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_properties_address ON properties(address_line1, city, state);
CREATE INDEX idx_properties_parcel ON properties(parcel_number);

-- Customers table
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    middle_name text,
    full_name text GENERATED ALWAYS AS (
        CASE 
            WHEN middle_name IS NOT NULL THEN first_name || ' ' || middle_name || ' ' || last_name
            ELSE first_name || ' ' || last_name
        END
    ) STORED,
    email text,
    phone text,
    ssn_last4 text,
    date_of_birth date,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip_code text,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_full_name ON customers(full_name);

-- Loans table
CREATE TABLE loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number text NOT NULL UNIQUE,
    loan_date date NOT NULL,
    lender_id uuid NOT NULL REFERENCES lenders(id),
    contractor_id uuid REFERENCES contractors(id),
    property_id uuid REFERENCES properties(id),
    amount_financed numeric(12,2) NOT NULL,
    apr numeric(5,2) NOT NULL,
    finance_charge numeric(12,2) NOT NULL,
    total_payments numeric(12,2) NOT NULL,
    term_months integer NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'standard',
    first_payment_date date NOT NULL,
    monthly_payment numeric(12,2) NOT NULL,
    status loan_status NOT NULL DEFAULT 'draft',
    contract_signed_date timestamptz,
    payoff_date date,
    payoff_amount numeric(12,2),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_loans_number ON loans(loan_number);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_contractor ON loans(contractor_id);
CREATE INDEX idx_loans_property ON loans(property_id);
CREATE INDEX idx_loans_date ON loans(loan_date);

-- Loan Customers junction table
CREATE TABLE loan_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customers(id),
    is_primary boolean DEFAULT false,
    relationship_type text CHECK (relationship_type IN ('primary', 'co-borrower', 'guarantor')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(loan_id, customer_id)
);

CREATE INDEX idx_loan_customers_loan ON loan_customers(loan_id);
CREATE INDEX idx_loan_customers_customer ON loan_customers(customer_id);

-- Systems table (for solar equipment details)
CREATE TABLE systems (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    system_type text DEFAULT 'solar',
    system_size_kw numeric(6,2),
    panel_count integer,
    panel_manufacturer text,
    panel_model text,
    inverter_manufacturer text,
    inverter_model text,
    battery_included boolean DEFAULT false,
    battery_details jsonb,
    installation_date date,
    warranty_years integer,
    estimated_annual_production numeric(10,2),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_systems_loan ON systems(loan_id);
CREATE INDEX idx_systems_installation_date ON systems(installation_date);

-- Payment Schedules table
CREATE TABLE payment_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    schedule_type payment_method NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    payment_day integer CHECK (payment_day BETWEEN 1 AND 31),
    payment_amount numeric(12,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    UNIQUE(loan_id, schedule_type, start_date)
);

CREATE INDEX idx_payment_schedules_loan ON payment_schedules(loan_id);
CREATE INDEX idx_payment_schedules_active ON payment_schedules(is_active);

-- Scheduled Payments table
CREATE TABLE scheduled_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    payment_schedule_id uuid REFERENCES payment_schedules(id) ON DELETE SET NULL,
    payment_number integer NOT NULL,
    due_date date NOT NULL,
    payment_amount numeric(12,2) NOT NULL,
    principal_amount numeric(12,2),
    interest_amount numeric(12,2),
    fees_amount numeric(12,2) DEFAULT 0,
    status payment_status NOT NULL DEFAULT 'scheduled',
    paid_date timestamptz,
    paid_amount numeric(12,2),
    transaction_reference text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(loan_id, payment_number)
);

CREATE INDEX idx_scheduled_payments_loan ON scheduled_payments(loan_id);
CREATE INDEX idx_scheduled_payments_due_date ON scheduled_payments(due_date);
CREATE INDEX idx_scheduled_payments_status ON scheduled_payments(status);

-- State Clauses table
CREATE TABLE state_clauses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code text NOT NULL,
    clause_type text NOT NULL,
    clause_title text NOT NULL,
    clause_text text NOT NULL,
    is_required boolean DEFAULT true,
    effective_date date,
    expiration_date date,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_state_clauses_state ON state_clauses(state_code);
CREATE INDEX idx_state_clauses_type ON state_clauses(clause_type);

-- Cases table (legal matters)
CREATE TABLE cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    case_type text NOT NULL,
    status case_status NOT NULL DEFAULT 'open',
    priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    loan_id uuid REFERENCES loans(id),
    customer_id uuid REFERENCES customers(id),
    assigned_to uuid,
    opened_date date NOT NULL DEFAULT CURRENT_DATE,
    closed_date date,
    due_date date,
    billable_hours numeric(6,2) DEFAULT 0,
    hourly_rate numeric(8,2),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_cases_number ON cases(case_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_loan ON cases(loan_id);
CREATE INDEX idx_cases_customer ON cases(customer_id);
CREATE INDEX idx_cases_assigned ON cases(assigned_to);

-- Case Documents table
CREATE TABLE case_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_name text NOT NULL,
    document_type text NOT NULL,
    file_path text,
    file_size bigint,
    mime_type text,
    status document_status NOT NULL DEFAULT 'draft',
    version integer NOT NULL DEFAULT 1,
    is_confidential boolean DEFAULT false,
    uploaded_by uuid,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_documents_case ON case_documents(case_id);
CREATE INDEX idx_case_documents_status ON case_documents(status);
CREATE INDEX idx_case_documents_type ON case_documents(document_type);

-- Case Notes table
CREATE TABLE case_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    note_type text CHECK (note_type IN ('general', 'phone', 'email', 'meeting', 'court', 'internal')),
    subject text NOT NULL,
    content text NOT NULL,
    is_private boolean DEFAULT false,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NOT NULL
);

CREATE INDEX idx_case_notes_case ON case_notes(case_id);
CREATE INDEX idx_case_notes_created ON case_notes(created_at DESC);

-- Tasks table
CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    status task_status NOT NULL DEFAULT 'todo',
    priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
    loan_id uuid REFERENCES loans(id) ON DELETE CASCADE,
    assigned_to uuid,
    due_date timestamptz,
    completed_date timestamptz,
    estimated_hours numeric(4,2),
    actual_hours numeric(4,2),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_loan ON tasks(loan_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Contract Templates table
CREATE TABLE contract_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name text NOT NULL,
    template_type text NOT NULL,
    description text,
    template_content text NOT NULL,
    variables jsonb DEFAULT '[]',
    is_active boolean DEFAULT true,
    version integer NOT NULL DEFAULT 1,
    state_specific text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX idx_contract_templates_name ON contract_templates(template_name);
CREATE INDEX idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX idx_contract_templates_active ON contract_templates(is_active);

-- Contract Entities table (for LLM extraction)
CREATE TABLE contract_entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id uuid,
    entity_type contract_entity_type NOT NULL,
    entity_name text NOT NULL,
    entity_value text NOT NULL,
    confidence_score numeric(3,2),
    context text,
    position_start integer,
    position_end integer,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    extracted_by text DEFAULT 'system'
);

CREATE INDEX idx_contract_entities_document ON contract_entities(source_document_id);
CREATE INDEX idx_contract_entities_type ON contract_entities(entity_type);
CREATE INDEX idx_contract_entities_name ON contract_entities(entity_name);

-- Create views for dashboard metrics
CREATE OR REPLACE VIEW loan_summary AS
SELECT 
    l.id,
    l.loan_number,
    l.loan_date,
    l.amount_financed,
    l.status,
    l.monthly_payment,
    lend.lender_name,
    c.contractor_name,
    COUNT(DISTINCT lc.customer_id) as customer_count,
    COUNT(DISTINCT sp.id) FILTER (WHERE sp.status = 'completed') as payments_completed,
    COUNT(DISTINCT sp.id) FILTER (WHERE sp.status = 'scheduled') as payments_scheduled,
    SUM(sp.paid_amount) as total_paid,
    l.total_payments - COALESCE(SUM(sp.paid_amount), 0) as remaining_balance
FROM loans l
LEFT JOIN lenders lend ON l.lender_id = lend.id
LEFT JOIN contractors c ON l.contractor_id = c.id
LEFT JOIN loan_customers lc ON l.id = lc.loan_id
LEFT JOIN scheduled_payments sp ON l.id = sp.loan_id
GROUP BY l.id, l.loan_number, l.loan_date, l.amount_financed, l.status, 
         l.monthly_payment, l.total_payments, lend.lender_name, c.contractor_name;

CREATE OR REPLACE VIEW payment_performance AS
SELECT 
    DATE_TRUNC('month', due_date) as month,
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_payments,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
    COUNT(*) FILTER (WHERE status = 'scheduled' AND due_date < CURRENT_DATE) as overdue_payments,
    SUM(payment_amount) as total_due,
    SUM(paid_amount) as total_collected,
    AVG(EXTRACT(DAYS FROM (paid_date - due_date))) FILTER (WHERE status = 'completed') as avg_days_to_payment
FROM scheduled_payments
GROUP BY DATE_TRUNC('month', due_date);

CREATE OR REPLACE VIEW case_workload AS
SELECT 
    assigned_to,
    COUNT(*) FILTER (WHERE status = 'open') as open_cases,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_cases,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_cases,
    SUM(billable_hours) as total_billable_hours,
    AVG(EXTRACT(DAYS FROM (COALESCE(closed_date, CURRENT_DATE) - opened_date))) as avg_case_duration
FROM cases
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;

-- Functions for complex calculations

-- Function to calculate APR
CREATE OR REPLACE FUNCTION calculate_apr(
    p_amount_financed numeric,
    p_finance_charge numeric,
    p_term_months integer
) RETURNS numeric AS $$
DECLARE
    v_apr numeric;
    v_monthly_rate numeric;
    v_total_payment numeric;
    v_monthly_payment numeric;
BEGIN
    -- Simple APR calculation (can be enhanced with more complex formulas)
    v_total_payment := p_amount_financed + p_finance_charge;
    v_monthly_payment := v_total_payment / p_term_months;
    
    -- Using approximation formula for APR
    v_monthly_rate := (p_finance_charge / p_amount_financed) / p_term_months;
    v_apr := v_monthly_rate * 12 * 100;
    
    RETURN ROUND(v_apr, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate payment schedule
CREATE OR REPLACE FUNCTION generate_payment_schedule(
    p_loan_id uuid,
    p_start_date date,
    p_payment_amount numeric,
    p_term_months integer,
    p_payment_day integer DEFAULT 1
) RETURNS void AS $$
DECLARE
    v_payment_date date;
    v_payment_number integer;
    v_principal_per_payment numeric;
    v_loan_amount numeric;
    v_remaining_balance numeric;
    v_interest_rate numeric;
    v_interest_amount numeric;
    v_principal_amount numeric;
BEGIN
    -- Get loan details
    SELECT amount_financed, apr INTO v_loan_amount, v_interest_rate
    FROM loans WHERE id = p_loan_id;
    
    v_remaining_balance := v_loan_amount;
    v_principal_per_payment := v_loan_amount / p_term_months;
    v_payment_date := p_start_date;
    
    -- Generate payments
    FOR v_payment_number IN 1..p_term_months LOOP
        -- Calculate interest for this payment
        v_interest_amount := ROUND((v_remaining_balance * (v_interest_rate / 100 / 12)), 2);
        v_principal_amount := p_payment_amount - v_interest_amount;
        
        -- Adjust last payment if needed
        IF v_payment_number = p_term_months THEN
            v_principal_amount := v_remaining_balance;
        END IF;
        
        -- Insert scheduled payment
        INSERT INTO scheduled_payments (
            loan_id, payment_number, due_date, payment_amount,
            principal_amount, interest_amount, status
        ) VALUES (
            p_loan_id, v_payment_number, v_payment_date, p_payment_amount,
            v_principal_amount, v_interest_amount, 'scheduled'
        );
        
        -- Update remaining balance
        v_remaining_balance := v_remaining_balance - v_principal_amount;
        
        -- Calculate next payment date
        v_payment_date := v_payment_date + INTERVAL '1 month';
        
        -- Adjust to specific day of month if specified
        IF p_payment_day > 0 AND p_payment_day <= 31 THEN
            v_payment_date := DATE_TRUNC('month', v_payment_date) + 
                             INTERVAL '1 day' * (p_payment_day - 1);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger functions for audit fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = TG_TABLE_SCHEMA
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END $$;

-- Row Level Security Policies
-- Enable RLS on all tables
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_entities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for loans table, apply similar pattern to others)
CREATE POLICY "Users can view their organization's loans" ON loans
    FOR SELECT USING (true);

CREATE POLICY "Users can insert loans for their organization" ON loans
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their organization's loans" ON loans
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their organization's loans" ON loans
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

$$);

-- Function to apply financial contract schema to a tenant
CREATE OR REPLACE FUNCTION private.apply_financial_contract_schema(p_schema_name text)
RETURNS void AS $$
DECLARE
    v_sql text;
BEGIN
    -- Get the migration SQL
    SELECT sql INTO v_sql
    FROM public.tenant_migration_files
    WHERE filename = 'financial_contract_schema.sql'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Replace schema references
    v_sql := REPLACE(v_sql, 'CREATE TABLE ', 'CREATE TABLE ' || p_schema_name || '.');
    v_sql := REPLACE(v_sql, 'ALTER TABLE ', 'ALTER TABLE ' || p_schema_name || '.');
    v_sql := REPLACE(v_sql, 'CREATE INDEX ', 'CREATE INDEX ');
    v_sql := REPLACE(v_sql, 'CREATE OR REPLACE VIEW ', 'CREATE OR REPLACE VIEW ' || p_schema_name || '.');
    v_sql := REPLACE(v_sql, 'REFERENCES ', 'REFERENCES ' || p_schema_name || '.');
    v_sql := REPLACE(v_sql, 'FROM ', 'FROM ' || p_schema_name || '.');
    v_sql := REPLACE(v_sql, 'JOIN ', 'JOIN ' || p_schema_name || '.');
    v_sql := REPLACE(v_sql, 'TG_TABLE_SCHEMA', '''' || p_schema_name || '''');
    
    -- Execute in the tenant schema
    EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to track migration status per tenant
CREATE TABLE IF NOT EXISTS private.tenant_migrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES private.organizations(id) ON DELETE CASCADE,
    migration_file text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id, migration_file)
);

CREATE INDEX idx_tenant_migrations_org ON private.tenant_migrations(organization_id);