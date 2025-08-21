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

--CREATE INDEX ON cost_types(name)
CREATE INDEX IF NOT EXISTS idx_cost_types_name ON {{schema_name}}.cost_types(name);
