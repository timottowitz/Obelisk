--CREATE EXPENSE TYPES TABLE
CREATE TABLE IF NOT EXISTS public.expense_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--CREATE INDEX ON expense_types(name)
CREATE INDEX IF NOT EXISTS idx_expense_types_name ON public.expense_types(name);