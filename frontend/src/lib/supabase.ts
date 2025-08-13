import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnmjwdxqtsvsbelcftzg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubWp3ZHhxdHN2c2JlbGNmdHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjM4ODAsImV4cCI6MjA2NDc5OTg4MH0.xXgy9V0gp_6SZYB9XeEFFELfVuwAJHBrztjXc_rpjDU';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
