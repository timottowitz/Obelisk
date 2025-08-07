import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, extractUserAndOrgId } from '../_shared/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AITaskInsightCreateData {
  case_id?: string;
  project_id?: string;
  suggested_title: string;
  suggested_description?: string;
  suggested_priority?: 'low' | 'medium' | 'high' | 'urgent';
  suggested_due_date?: string;
  suggested_assignee_id?: string;
  confidence_score: number;
  extracted_entities?: any[];
  ai_reasoning?: string;
  source_type?: string;
  source_reference?: string;
}

interface ReviewAITaskRequest {
  insight_id: string;
  decision: 'accept' | 'reject';
  reason?: string;
  modifications?: Record<string, any>;
}

interface BulkReviewRequest {
  insight_ids: string[];
  decision: 'accept' | 'reject';
  reason?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, supabase } = await extractUserAndOrgId(req);
    
    // Check if user has permission to manage AI insights
    const checkPermission = async (action: 'view' | 'create' | 'review') => {
      // Check user role in organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (!member) {
        throw new Error('User is not a member of this organization');
      }
      
      // Permission matrix
      const permissions = {
        view: ['admin', 'attorney', 'paralegal', 'staff'],
        create: ['admin', 'attorney'],
        review: ['admin', 'attorney'],
      };
      
      if (!permissions[action].includes(member.role)) {
        throw new Error(`Insufficient permissions for ${action} action`);
      }
      
      return true;
    };
    
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/ai-insights', '');
    const method = req.method;

    // Route: GET /cases/{caseId} - Get AI insights for a case
    if (method === 'GET' && path.match(/^\/cases\/[a-zA-Z0-9-]+$/)) {
      await checkPermission('view');
      const caseId = path.split('/')[2];
      
      const { data, error } = await supabase
        .from('ai_task_insights')
        .select(`
          *,
          case:cases(*),
          assignee:users(*),
          reviewer:users!ai_task_insights_reviewed_by_fkey(*),
          task:tasks(*)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: GET /projects/{projectId} - Get AI insights for a project
    if (method === 'GET' && path.match(/^\/projects\/[a-zA-Z0-9-]+$/)) {
      await checkPermission('view');
      const projectId = path.split('/')[2];
      
      const { data, error } = await supabase
        .from('ai_task_insights')
        .select(`
          *,
          project:projects(*),
          assignee:users(*),
          reviewer:users!ai_task_insights_reviewed_by_fkey(*),
          task:tasks(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: GET /pending - Get all pending AI insights
    if (method === 'GET' && path === '/pending') {
      await checkPermission('view');
      const { data, error } = await supabase
        .from('ai_task_insights')
        .select(`
          *,
          case:cases(*),
          project:projects(*),
          assignee:users(*),
          reviewer:users!ai_task_insights_reviewed_by_fkey(*),
          task:tasks(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: GET /tasks/{taskId} - Get AI insights for a specific task
    if (method === 'GET' && path.match(/^\/tasks\/[a-zA-Z0-9-]+$/)) {
      const taskId = path.split('/')[2];
      
      const { data, error } = await supabase
        .from('ai_task_insights')
        .select(`
          *,
          assignee:users(*),
          reviewer:users!ai_task_insights_reviewed_by_fkey(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: GET /{insightId} - Get specific AI insight details
    if (method === 'GET' && path.match(/^\/[a-zA-Z0-9-]+$/)) {
      const insightId = path.substring(1);
      
      const { data, error } = await supabase
        .from('ai_task_insights')
        .select(`
          *,
          case:cases(*),
          project:projects(*),
          assignee:users(*),
          reviewer:users!ai_task_insights_reviewed_by_fkey(*),
          task:tasks(*)
        `)
        .eq('id', insightId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: GET /stats - Get AI insights statistics
    if (method === 'GET' && path === '/stats') {
      const { data, error } = await supabase
        .from('ai_task_insights')
        .select('status, source_type, confidence_score');

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(d => d.status === 'pending').length,
        accepted: data.filter(d => d.status === 'accepted').length,
        rejected: data.filter(d => d.status === 'rejected').length,
        high_confidence: data.filter(d => d.confidence_score >= 0.8).length,
        by_source: data.reduce((acc, d) => {
          if (d.source_type) {
            acc[d.source_type] = (acc[d.source_type] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      };

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: POST /create - Create new AI insight
    if (method === 'POST' && path === '/create') {
      await checkPermission('create');
      const body: AITaskInsightCreateData = await req.json();

      const { data, error } = await supabase
        .from('ai_task_insights')
        .insert({
          ...body,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: POST /review - Review an AI suggestion
    if (method === 'POST' && path === '/review') {
      await checkPermission('review');
      const body: ReviewAITaskRequest = await req.json();

      if (body.decision === 'accept') {
        // Use the database function to accept the suggestion
        const { data, error } = await supabase.rpc('accept_ai_suggestion', {
          p_insight_id: body.insight_id,
          p_user_id: user.id
        });

        if (error) throw error;

        return new Response(JSON.stringify({ task_id: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // Use the database function to reject the suggestion
        const { error } = await supabase.rpc('reject_ai_suggestion', {
          p_insight_id: body.insight_id,
          p_user_id: user.id,
          p_reason: body.reason || null
        });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: POST /bulk-review - Bulk review AI suggestions
    if (method === 'POST' && path === '/bulk-review') {
      await checkPermission('review');
      const body: BulkReviewRequest = await req.json();
      
      const results = [];
      
      for (const insightId of body.insight_ids) {
        try {
          if (body.decision === 'accept') {
            const { data, error } = await supabase.rpc('accept_ai_suggestion', {
              p_insight_id: insightId,
              p_user_id: user.id
            });
            if (error) throw error;
            results.push(data);
          } else {
            const { error } = await supabase.rpc('reject_ai_suggestion', {
              p_insight_id: insightId,
              p_user_id: user.id,
              p_reason: body.reason || null
            });
            if (error) throw error;
          }
        } catch (error) {
          console.error(`Error processing insight ${insightId}:`, error);
          // Continue with other insights even if one fails
        }
      }

      return new Response(JSON.stringify({ 
        task_ids: body.decision === 'accept' ? results : [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('AI Insights API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});