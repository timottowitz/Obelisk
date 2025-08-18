--CREATE CASE INVOICES TABLE
CREATE TABLE IF NOT EXISTS {{schema_name}}.case_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES {{schema_name}}.cases(id),
    expense_type_id UUID NOT NULL REFERENCES public.expense_types(id),
    type VARCHAR(255),
    amount FLOAT NOT NULL,
    payee_id UUID NOT NULL REFERENCES {{schema_name}}.contacts(id),
    attachment_id UUID REFERENCES {{schema_name}}.storage_files(id),
    invoice_number VARCHAR(255),
    invoice_date DATE,
    due_date DATE,
    description TEXT,
    notes TEXT,
    memo TEXT,
    create_checking_quickbooks BOOLEAN NOT NULL DEFAULT FALSE,
    create_billing_item BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(255) NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'created', 'deleted', 'paid', 'printed', 'void')),
    last_updated_from_quickbooks TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);