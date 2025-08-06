--ADD CASES ADDITIONAL COLUMNS
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS adr_process text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS applicable_rules text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS track text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS claim_amount text;
ALTER TABLE {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS hearing_locale text;