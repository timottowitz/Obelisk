ALTER TABLE {{schema_name}}.case_events
DROP COLUMN status,
DROP COLUMN method,
DROP COLUMN location,
DROP COLUMN address;

ALTER TABLE {{schema_name}}.case_events
ADD COLUMN description TEXT;






