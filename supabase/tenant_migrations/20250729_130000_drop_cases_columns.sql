--DROP CASES COLUMNS
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS title;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS client_name_encrypted;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS opposing_party_encrypted;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS lead_attorney_id;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS team_member_ids;  
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS client_id;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS client_portal_enabled;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS conflict_check_completed_at;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS conflict_check_completed_by;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS retention_policy;
ALTER TABLE {{schema_name}}.cases
DROP COLUMN IF EXISTS destroy_after_date;