--Create Contact Type table
CREATE TABLE IF NOT EXISTS {{schema_name}}.contact_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_types_name ON {{schema_name}}.contact_types(name);

--CREATE EXPENSE TYPES TABLE
CREATE TABLE IF NOT EXISTS {{schema_name}}.expense_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--CREATE INDEX ON expense_types(name)
CREATE INDEX IF NOT EXISTS idx_expense_types_name ON {{schema_name}}.expense_types(name);   

--CREATE COST TYPES TABLE
CREATE TABLE IF NOT EXISTS {{schema_name}}.cost_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--CREATE CASE EXPENSES TABLE
CREATE TABLE IF NOT EXISTS {{schema_name}}.case_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES {{schema_name}}.cases(id),
    expense_type_id UUID NOT NULL REFERENCES {{schema_name}}.expense_types(id),
    cost_type_id UUID REFERENCES {{schema_name}}.cost_types(id),
    amount FLOAT NOT NULL,
    payee_id UUID REFERENCES {{schema_name}}.contacts(id),
    attachment_id UUID REFERENCES {{schema_name}}.storage_files(id),
    invoice_number VARCHAR(255),
    invoice_date DATE,
    due_date DATE,
    description TEXT,
    notes TEXT,
    memo TEXT,
    bill_no TEXT,
    date_of_check DATE,
    check_number INTEGER,
    copy_of_check_id UUID REFERENCES {{schema_name}}.storage_files(id),
    notify_admin_of_check_payment TEXT,
    create_checking_quickbooks BOOLEAN DEFAULT false,
    create_billing_item BOOLEAN DEFAULT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'created', 'deleted', 'paid', 'printed', 'void')),
    last_updated_from_quickbooks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);