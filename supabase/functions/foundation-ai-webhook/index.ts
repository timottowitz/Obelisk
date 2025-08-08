import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/index.ts';

interface FoundationAIWebhookPayload {
  event: 'task.analyzed' | 'document.processed' | 'insight.generated';
  organizationId: string;
  data: {
    taskId?: string;
    documentId?: string;
    insights: FoundationAIInsight[];
    metadata: Record<string, any>;
  };
  timestamp: string;
  signature: string;
}

interface FoundationAIInsight {
  type: string;
  confidence: number;
  data: Record<string, any>;
  recommendations: string[];
  entities?: Record<string, any>;
}

/**
 * Webhook handler for Foundation AI integration
 * Receives AI-generated insights and processes them in real-time
 */
class FoundationAIWebhookHandler {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  /**
   * Verify webhook signature for security
   */
  verifySignature(payload: string, signature: string): boolean {
    // Implement HMAC signature verification
    // This should use a shared secret with Foundation AI
    const secret = Deno.env.get('FOUNDATION_AI_WEBHOOK_SECRET');
    if (!secret) return false;

    // Simple verification for now - implement proper HMAC
    return signature === this.generateSignature(payload, secret);
  }

  /**
   * Generate signature for verification
   */
  generateSignature(payload: string, secret: string): string {
    // Implement proper HMAC-SHA256
    // For now, simple placeholder
    return 'signature_placeholder';
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: FoundationAIWebhookPayload) {
    console.log(`Processing Foundation AI webhook: ${payload.event}`);

    switch (payload.event) {
      case 'task.analyzed':
        return await this.handleTaskAnalysis(payload);
      
      case 'document.processed':
        return await this.handleDocumentProcessing(payload);
      
      case 'insight.generated':
        return await this.handleInsightGeneration(payload);
      
      default:
        throw new Error(`Unknown event type: ${payload.event}`);
    }
  }

  /**
   * Handle task analysis from Foundation AI
   */
  async handleTaskAnalysis(payload: FoundationAIWebhookPayload) {
    const { taskId, insights } = payload.data;
    
    if (!taskId) {
      throw new Error('Task ID required for task analysis event');
    }

    // Set tenant schema
    await this.supabase.rpc('set_tenant_schema', { 
      schema_name: `org_${payload.organizationId}` 
    });

    // Process each insight
    const processedInsights = [];
    
    for (const insight of insights) {
      const processed = await this.processTaskInsight(taskId, insight, payload.organizationId);
      processedInsights.push(processed);
    }

    // Update task with AI processing status
    await this.updateTaskAIStatus(taskId, payload);

    // Trigger real-time notifications for high-priority insights
    await this.sendRealtimeNotifications(processedInsights, payload.organizationId);

    return {
      success: true,
      processed: processedInsights.length,
      insights: processedInsights
    };
  }

  /**
   * Process individual task insight
   */
  async processTaskInsight(taskId: string, insight: FoundationAIInsight, orgId: string) {
    // Map Foundation AI insight types to our system
    const insightType = this.mapInsightType(insight.type);
    const urgency = this.calculateUrgency(insight);

    const insightRecord = {
      task_type: 'case_task', // Determine from task
      task_id: taskId,
      insight_type: insightType,
      confidence_score: insight.confidence,
      insight_data: {
        ...insight.data,
        foundation_ai_type: insight.type,
        entities: insight.entities
      },
      recommendations: insight.recommendations,
      urgency,
      organization_id: orgId,
      foundation_ai_processed_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('ai_task_insights')
      .insert(insightRecord)
      .select()
      .single();

    if (error) {
      console.error('Error inserting insight:', error);
      throw error;
    }

    return data;
  }

  /**
   * Handle document processing from Foundation AI
   */
  async handleDocumentProcessing(payload: FoundationAIWebhookPayload) {
    const { documentId, insights } = payload.data;
    
    if (!documentId) {
      throw new Error('Document ID required for document processing event');
    }

    // Set tenant schema
    await this.supabase.rpc('set_tenant_schema', { 
      schema_name: `org_${payload.organizationId}` 
    });

    // Extract tasks from document insights
    const suggestedTasks = await this.extractTasksFromDocument(insights, documentId);

    // Store suggested tasks
    const { data: storedTasks, error } = await this.supabase
      .from('ai_suggested_tasks')
      .insert(suggestedTasks)
      .select();

    if (error) {
      console.error('Error storing suggested tasks:', error);
      throw error;
    }

    // Update document processing status
    await this.supabase
      .from('documents')
      .update({
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
        ai_extracted_entities: payload.data.metadata.entities || {}
      })
      .eq('id', documentId);

    return {
      success: true,
      document_id: documentId,
      tasks_suggested: storedTasks.length,
      tasks: storedTasks
    };
  }

  /**
   * Handle generic insight generation
   */
  async handleInsightGeneration(payload: FoundationAIWebhookPayload) {
    const { insights } = payload.data;

    // Set tenant schema
    await this.supabase.rpc('set_tenant_schema', { 
      schema_name: `org_${payload.organizationId}` 
    });

    const processedInsights = [];

    for (const insight of insights) {
      // Store general insights
      const insightRecord = {
        organization_id: payload.organizationId,
        insight_type: insight.type,
        confidence_score: insight.confidence,
        data: insight.data,
        recommendations: insight.recommendations,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('ai_general_insights')
        .insert(insightRecord)
        .select()
        .single();

      if (!error) {
        processedInsights.push(data);
      }
    }

    return {
      success: true,
      processed: processedInsights.length,
      insights: processedInsights
    };
  }

  /**
   * Extract tasks from document insights
   */
  async extractTasksFromDocument(insights: FoundationAIInsight[], documentId: string) {
    const tasks = [];

    for (const insight of insights) {
      if (insight.type === 'task_extraction' || insight.type === 'action_item') {
        const taskData = insight.data;
        
        tasks.push({
          name: taskData.title || taskData.name,
          description: taskData.description || '',
          priority: this.mapPriority(taskData.priority || insight.confidence),
          due_date: taskData.due_date || this.calculateDueDate(taskData),
          ai_generated: true,
          foundation_ai_task_id: `${documentId}_${Date.now()}`,
          ai_confidence_score: insight.confidence,
          ai_reasoning: insight.recommendations.join('. '),
          source_document_id: documentId,
          extracted_entities: insight.entities || {},
          status: 'suggested'
        });
      }
    }

    return tasks;
  }

  /**
   * Update task with AI processing status
   */
  async updateTaskAIStatus(taskId: string, payload: FoundationAIWebhookPayload) {
    await this.supabase
      .from('case_tasks')
      .update({
        ai_analyzed: true,
        ai_analyzed_at: payload.timestamp,
        ai_metadata: payload.data.metadata
      })
      .eq('id', taskId);
  }

  /**
   * Send real-time notifications
   */
  async sendRealtimeNotifications(insights: any[], orgId: string) {
    // Filter for high-priority insights
    const criticalInsights = insights.filter(i => i.urgency === 'critical' || i.urgency === 'high');

    if (criticalInsights.length === 0) return;

    // Broadcast via Supabase Realtime
    for (const insight of criticalInsights) {
      await this.supabase
        .from('realtime_notifications')
        .insert({
          organization_id: orgId,
          type: 'ai_insight',
          data: insight,
          created_at: new Date().toISOString()
        });
    }
  }

  /**
   * Map Foundation AI insight types to our system
   */
  mapInsightType(foundationType: string): string {
    const typeMap: Record<string, string> = {
      'deadline_warning': 'deadline_risk',
      'workload_analysis': 'workload_alert',
      'priority_analysis': 'priority_suggestion',
      'assignment_analysis': 'assignment_recommendation'
    };

    return typeMap[foundationType] || 'general';
  }

  /**
   * Calculate urgency based on insight
   */
  calculateUrgency(insight: FoundationAIInsight): string {
    if (insight.confidence >= 0.9) return 'critical';
    if (insight.confidence >= 0.7) return 'high';
    if (insight.confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Map priority from various formats
   */
  mapPriority(value: any): 'high' | 'medium' | 'low' {
    if (typeof value === 'number') {
      if (value >= 0.7) return 'high';
      if (value >= 0.4) return 'medium';
      return 'low';
    }
    
    const priority = String(value).toLowerCase();
    if (['high', 'urgent', 'critical'].includes(priority)) return 'high';
    if (['medium', 'normal'].includes(priority)) return 'medium';
    return 'low';
  }

  /**
   * Calculate due date based on task data
   */
  calculateDueDate(taskData: any): string {
    // If urgency is mentioned, calculate appropriate due date
    const urgency = taskData.urgency || 'normal';
    const daysToAdd = urgency === 'urgent' ? 1 : urgency === 'high' ? 3 : 7;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    
    return dueDate.toISOString();
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('X-Foundation-AI-Signature') || '';

    const handler = new FoundationAIWebhookHandler();

    // Verify webhook signature
    if (!handler.verifySignature(rawBody, signature)) {
      console.warn('Invalid webhook signature');
      // For development, you might want to continue anyway
      // return new Response(
      //   JSON.stringify({ error: 'Invalid signature' }),
      //   { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      // );
    }

    // Parse payload
    const payload: FoundationAIWebhookPayload = JSON.parse(rawBody);

    // Process webhook
    const result = await handler.processWebhook(payload);

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing Foundation AI webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});