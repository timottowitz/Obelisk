ALTER TABLE {{schema_name}}.case_events
DROP COLUMN date,
DROP COLUMN time;

ALTER TABLE {{schema_name}}.case_events
ADD COLUMN date DATE,
ADD COLUMN time TIME;






