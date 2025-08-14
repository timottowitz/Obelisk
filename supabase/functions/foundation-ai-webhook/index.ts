import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FoundationAIWebhookPayload {
  event: "task.analyzed" | "document.processed" | "insight.generated";
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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }

  /**
   * Verify webhook signature for security
   */
  async verifySignature(payload: string, signature: string): Promise<boolean> {
    // Implement HMAC signature verification
    // This should use a shared secret with Foundation AI
    const secret = Deno.env.get("FOUNDATION_AI_WEBHOOK_SECRET");
    if (!secret) return false;

    // Simple verification for now - implement proper HMAC
    return signature === (await this.generateSignature(payload, secret));
  }

  /**
   * Generate signature for verification
   */
  async generateSignature(payload: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const bytes = Array.from(new Uint8Array(sig));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: FoundationAIWebhookPayload) {
    console.log(`Processing Foundation AI webhook: ${payload.event}`);

    switch (payload.event) {
      case "task.analyzed":
        return await this.handleTaskAnalysis(payload);

      case "document.processed":
        return await this.handleDocumentProcessing(payload);

      case "insight.generated":
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
      throw new Error("Task ID required for task analysis event");
    }

    // Process each insight
    const processedInsights = [];

    const { data: org, error: orgError } = await this.supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", payload.organizationId)
      .single();

    if (orgError) {
      console.error("Error fetching organization:", orgError);
      throw orgError;
    }

    for (const insight of insights) {
      const processed = await this.processTaskInsight(taskId, insight, org);
      processedInsights.push(processed);
    }

    // Update task with AI processing status
    // await this.updateTaskAIStatus(taskId, payload); // No-op: remove or log only

    // Trigger real-time notifications for high-priority insights
    await this.sendRealtimeNotifications(
      processedInsights,
      org
    );

    return {
      success: true,
      processed: processedInsights.length,
      insights: processedInsights,
    };
  }

  /**
   * Process individual task insight
   */
  async processTaskInsight(
    taskId: string,
    insight: FoundationAIInsight,
    org: any
  ) {
    // Get task details to determine case_id or project_id
    const { data: task, error: taskError } = await this.supabase
      .schema(org.data.schema_name.toLowerCase())
      .from("case_tasks")
      .select("id, case_id, case_project_id, name")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task:", taskError);
      throw taskError;
    }

    const insightRecord = {
      task_id: taskId,
      case_id: task.case_id,
      project_id: null, // case task
      suggested_title: insight.data?.title || task.name,
      suggested_description:
        insight.data.description || insight.recommendations.join(". "),
      suggested_priority: this.mapPriority(
        insight.data.priority || insight.confidence
      ),
      suggested_due_date:
        insight.data?.due_date || this.calculateDueDate(insight.data), // returns ISO string
      suggested_assignee_id: insight.data?.assignee_id || null,
      suggested_case_project_id: task.case_project_id || null,
      confidence_score: insight.confidence,
      extracted_entities: insight.entities || [],
      ai_reasoning: insight.recommendations.join(". "),
      source_type: "transcript", // or 'manual' if appropriate
      source_reference: `foundation_ai_${insight.type}`,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("ai_task_insights")
      .insert(insightRecord)
      .select()
      .single();

    if (error) {
      console.error("Error inserting insight:", error);
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
      throw new Error("Document ID required for document processing event");
    }

    const { data: org, error: orgError } = await this.supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", payload.organizationId)
      .single();

    if (orgError) {
      console.error("Error fetching organization:", orgError);
      throw orgError;
    }

    // Extract tasks from document insights
    const suggestedInsights = await this.extractTasksFromDocument(
      insights,
      documentId,
    );

    // Store suggested insights in ai_task_insights table
    const { data: storedInsights, error } = await this.supabase
      .schema(org.data.schema_name.toLowerCase())
      .from("ai_task_insights")
      .insert(suggestedInsights)
      .select();

    if (error) {
      console.error("Error storing suggested insights:", error);
      throw error;
    }

    // Note: Documents table may not exist in all tenants
    // Log document processing without updating non-existent table
    console.log(
      `Document ${documentId} processed with ${suggestedInsights.length} insights`
    );

    return {
      success: true,
      document_id: documentId,
      insights_suggested: storedInsights.length,
      insights: storedInsights,
    };
  }

  /**
   * Handle generic insight generation
   */
  async handleInsightGeneration(payload: FoundationAIWebhookPayload) {
    const { insights } = payload.data;

    const { data: org, error: orgError } = await this.supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", payload.organizationId)
      .single();

    if (orgError) {
      console.error("Error fetching organization:", orgError);
      throw orgError;
    }

    const processedInsights = [];

    for (const insight of insights) {
      // Store as AI task insights without specific task association
      const insightRecord = {
        suggested_title: insight.data.title || "AI Insight",
        suggested_description:
          insight.data.description || insight.recommendations.join(". "),
        suggested_priority: this.mapPriority(insight.confidence),
        confidence_score: insight.confidence,
        extracted_entities: insight.entities || [],
        ai_reasoning: insight.recommendations.join(". "),
        source_type: "general",
        source_reference: `general_insight_${insight.type}`,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .schema(org.data.schema_name.toLowerCase())
        .from("ai_task_insights")
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
      insights: processedInsights,
    };
  }

  /**
   * Extract tasks from document insights
   */
  extractTasksFromDocument(
    insights: FoundationAIInsight[],
    documentId: string
  ) {
    const suggestedInsights = [];

    for (const insight of insights) {
      if (
        insight.type === "task_extraction" ||
        insight.type === "action_item"
      ) {
        const taskData = insight.data;

        // Create an AI task insight for suggested task
        suggestedInsights.push({
          suggested_title: taskData.title || taskData.name || "New Task",
          suggested_description:
            taskData.description || insight.recommendations.join(". "),
          suggested_priority: this.mapPriority(
            taskData.priority || insight.confidence
          ),
          suggested_due_date:
            taskData.due_date || this.calculateDueDate(taskData),
          suggested_assignee_id: taskData.assignee_id || null,
          confidence_score: insight.confidence,
          extracted_entities: insight.entities || [],
          ai_reasoning: insight.recommendations.join(". "),
          source_type: "document",
          source_reference: documentId,
          status: "pending",
          created_at: new Date().toISOString(),
        });
      }
    }

    return suggestedInsights;
  }

  /**
   * Update task with AI processing status
   */
  // async updateTaskAIStatus(
  //   taskId: string,
  //   payload: FoundationAIWebhookPayload
  // ) {
  //   // No-op: remove or log only
  // }

  /**
   * Send real-time notifications
   */
  sendRealtimeNotifications(insights: any[], org: any) {
    // Filter for high-priority insights
    const criticalInsights = insights.filter(
      (i) => i.suggested_priority === "high" || i.confidence_score >= 0.8
    );

    if (criticalInsights.length === 0) return;

    // Log critical insights for monitoring
    console.log(
      `${criticalInsights.length} critical insights generated for ${org.data.schema_name.toLowerCase()}`
    );

    // Note: Real-time notifications would be handled by Supabase Realtime
    // on the ai_task_insights table changes
  }

  /**
   * Map Foundation AI insight types to our system
   */
  mapInsightType(foundationType: string): string {
    const typeMap: Record<string, string> = {
      deadline_warning: "deadline_risk",
      workload_analysis: "workload_alert",
      priority_analysis: "priority_suggestion",
      assignment_analysis: "assignment_recommendation",
    };

    return typeMap[foundationType] || "general";
  }

  /**
   * Calculate urgency based on insight
   */
  calculateUrgency(insight: FoundationAIInsight): "high" | "medium" | "low" {
    if (insight.confidence >= 0.8) return "high";
    if (insight.confidence >= 0.5) return "medium";
    return "low";
  }

  /**
   * Map priority from various formats
   */
  mapPriority(value: any): "high" | "medium" | "low" {
    if (typeof value === "number") {
      if (value >= 0.7) return "high";
      if (value >= 0.4) return "medium";
      return "low";
    }

    const priority = String(value).toLowerCase();
    if (["high", "urgent", "critical"].includes(priority)) return "high";
    if (["medium", "normal"].includes(priority)) return "medium";
    return "low";
  }

  /**
   * Calculate due date based on task data
   */
  calculateDueDate(taskData: any): string | null {
    // If a due date is already provided, use it
    if (taskData.due_date) {
      return taskData.due_date;
    }

    // If urgency is mentioned, calculate appropriate due date
    const urgency = taskData.urgency || taskData.priority || "normal";
    const daysToAdd =
      urgency === "urgent" || urgency === "high"
        ? 3
        : urgency === "medium"
        ? 7
        : 14;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToAdd);

    return dueDate.toISOString();
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("X-Foundation-AI-Signature") || "";

    const handler = new FoundationAIWebhookHandler();

    // Verify webhook signature
    if (!(await handler.verifySignature(rawBody, signature))) {
      console.warn("Invalid webhook signature");
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
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing Foundation AI webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
