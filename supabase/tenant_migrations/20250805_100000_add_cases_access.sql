-- ADD ACCESS COLOUNN TO CASES TABLE
ALTER TABLE {{schema_name}}.cases 
ADD COLUMN access TEXT DEFAULT 'admin_only' CHECK (access IN ('admin_only', 'public'));
