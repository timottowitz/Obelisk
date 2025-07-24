-- Disable RLS for meeting intelligence tables
ALTER TABLE {{schema_name}}.meeting_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.meeting_action_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.meeting_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.meeting_topics DISABLE ROW LEVEL SECURITY; 