--ADD CASES ADDITIONAL COLUMNS
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS case_type uuid REFERENCES {{schema_name}}.case_types(id) ON DELETE SET NULL;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS special_notes text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS filing_fee text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS claimant text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS respondent text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS case_manager text;