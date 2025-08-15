--UPDATE CASES COLUMNS
ALTER TABLE IF EXISTS {{schema_name}}.cases
DROP COLUMN IF EXISTS claimant,
DROP COLUMN IF EXISTS respondent;

ALTER TABLE IF EXISTS {{schema_name}}.cases
ADD COLUMN IF NOT EXISTS claimant_id uuid REFERENCES {{schema_name}}.contacts(id),
ADD COLUMN IF NOT EXISTS respondent_id uuid REFERENCES {{schema_name}}.contacts(id),
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS initial_task TEXT,
ADD COLUMN IF NOT EXISTS next_event DATE;






