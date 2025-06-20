// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { Hono } from 'jsr:@hono/hono';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log("Hello from Functions!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-schema',
};

const app = new Hono();

// Helper to format duration
function formatDuration(milliseconds: number): string {
  if (!milliseconds) return '0s';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}min`;
  } else {
    return `${seconds}s`;
  }
}

// Middleware for CORS preflight
app.options('/*', (c) => c.text('ok', 200, corsHeaders));

// Main route for /call-recordings
app.get('/call-recordings', async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

      // Auth
      const authHeader = c.req.header('authorization')?.replace('Bearer ', '');
      if (!authHeader) {
        return c.json({ error: 'Missing authorization header' }, 401, corsHeaders);
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
      if (authError || !user) {
        return c.json({ error: 'Invalid authorization token' }, 401, corsHeaders);
      }

      // Tenant schema
      const tenantSchema = c.req.header('x-tenant-schema');
      if (!tenantSchema) {
        return c.json({ error: 'Missing tenant schema header' }, 400, corsHeaders);
      }
      const schema = tenantSchema;

      // Parse query params
      const url = new URL(c.req.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const orderBy = url.searchParams.get('orderBy') || 'start_time';
      const orderDirection = (url.searchParams.get('orderDirection') || 'desc') as 'asc' | 'desc';
      const search = url.searchParams.get('search') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const startDate = url.searchParams.get('startDate') || undefined;
      const endDate = url.searchParams.get('endDate') || undefined;

      // Check if requesting a specific recording by ID
      const pathParts = url.pathname.split('/');
      const recordingId = pathParts[pathParts.length - 1];
      const table = `${schema}.call_recordings`;

      if (recordingId && recordingId !== 'call-recordings') {
        // Get single recording
        const { data: recording, error } = await supabase
          .from(table)
          .select('*')
          .eq('member_id', user.id)
          .eq('id', recordingId)
          .single();
        if (error || !recording) {
          return c.json({ error: 'Recording not found' }, 404, corsHeaders);
        }
        return c.json({ recording }, 200, corsHeaders);
      }

      // List query
      let query = supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('member_id', user.id);
      if (search) {
        query = query.or(`title.ilike.%${search}%,participants.cs.{${search}}`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('start_time', startDate);
      }
      if (endDate) {
        query = query.lte('start_time', endDate);
      }
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      query = query.range(offset, offset + limit - 1);
      const { data: recordings, error, count } = await query;
      if (error) {
        return c.json({ error: 'Failed to fetch recordings', details: error }, 500, corsHeaders);
      }
      const formattedRecordings = (recordings || []).map((recording: any) => ({
        ...recording,
        date: new Date(recording.start_time).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        }),
        time: new Date(recording.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit'
        }),
        duration: formatDuration(recording.duration),
        transcript: recording.ai_analysis ? {
          summary: recording.ai_summary,
          actionItems: recording.action_items || [],
          keyTopics: recording.key_topics || [],
          sentiment: recording.sentiment,
          wordCount: recording.word_count
        } : null
      }));
      return c.json({
        recordings: formattedRecordings,
        total: count || 0,
        limit,
        offset
      }, 200, corsHeaders);
    } catch (error: any) {
      return c.json({ error: error.message }, 500, corsHeaders);
    }
  });

//   // PATCH: Update recording
//   r.patch('/*', async (c) => {
//     try {
//       const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
//       const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
//       const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
//       const authHeader = c.req.header('authorization')?.replace('Bearer ', '');
//       if (!authHeader) {
//         return c.json({ error: 'Missing authorization header' }, 401, corsHeaders);
//       }
//       const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
//       if (authError || !user) {
//         return c.json({ error: 'Invalid authorization token' }, 401, corsHeaders);
//       }
//       const tenantSchema = c.req.header('x-tenant-schema');
//       if (!tenantSchema) {
//         return c.json({ error: 'Missing tenant schema header' }, 400, corsHeaders);
//       }
//       const schema = tenantSchema;
//       const url = new URL(c.req.url);
//       const pathParts = url.pathname.split('/');
//       const recordingId = pathParts[pathParts.length - 1];
//       if (!recordingId || recordingId === 'call-recordings') {
//         return c.json({ error: 'Recording ID required' }, 400, corsHeaders);
//       }
//       const body = await c.req.json();
//       const { title, participants, is_public, sharing_link } = body;
//       const updateData: any = {};
//       if (title !== undefined) updateData.title = title;
//       if (participants !== undefined) updateData.participants = participants;
//       if (is_public !== undefined) updateData.is_public = is_public;
//       if (sharing_link !== undefined) updateData.sharing_link = sharing_link;
//       const table = `${schema}.call_recordings`;
//       const { data, error } = await supabase
//         .from(table)
//         .update(updateData)
//         .eq('id', recordingId)
//         .eq('member_id', user.id)
//         .select()
//         .single();
//       if (error) {
//         return c.json({ error: 'Failed to update recording', details: error }, 500, corsHeaders);
//       }
//       return c.json({ recording: data }, 200, corsHeaders);
//     } catch (error: any) {
//       return c.json({ error: error.message }, 500, corsHeaders);
//     }
//   });

//   // DELETE: Delete recording
//   r.delete('/*', async (c) => {
//     try {
//       const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
//       const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
//       const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
//       const authHeader = c.req.header('authorization')?.replace('Bearer ', '');
//       if (!authHeader) {
//         return c.json({ error: 'Missing authorization header' }, 401, corsHeaders);
//       }
//       const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
//       if (authError || !user) {
//         return c.json({ error: 'Invalid authorization token' }, 401, corsHeaders);
//       }
//       const tenantSchema = c.req.header('x-tenant-schema');
//       if (!tenantSchema) {
//         return c.json({ error: 'Missing tenant schema header' }, 400, corsHeaders);
//       }
//       const schema = tenantSchema;
//       const url = new URL(c.req.url);
//       const pathParts = url.pathname.split('/');
//       const recordingId = pathParts[pathParts.length - 1];
//       if (!recordingId || recordingId === 'call-recordings') {
//         return c.json({ error: 'Recording ID required' }, 400, corsHeaders);
//       }
//       const table = `${schema}.call_recordings`;
//       const { error } = await supabase
//         .from(table)
//         .delete()
//         .eq('id', recordingId)
//         .eq('member_id', user.id);
//       if (error) {
//         return c.json({ error: 'Failed to delete recording', details: error }, 500, corsHeaders);
//       }
//       return c.json({ success: true }, 200, corsHeaders);
//     } catch (error: any) {
//       return c.json({ error: error.message }, 500, corsHeaders);
//     }
//   });
// });

export default app;

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/call-recordings' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
