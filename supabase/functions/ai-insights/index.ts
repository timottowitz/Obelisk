import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";

interface AITaskInsightCreateData {
  case_id?: string;
  project_id?: string;
  suggested_title: string;
  suggested_description?: string;
  suggested_priority?: "low" | "medium" | "high" | "urgent";
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
  decision: "accept" | "reject";
  reason?: string;
  modifications?: Record<string, any>;
}

interface BulkReviewRequest {
  insight_ids: string[];
  decision: "accept" | "reject";
  reason?: string;
}

console.log("Hello from AI Insights Functions!");

const app = new Hono();

// Configure CORS with proper options handling
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id"],
    credentials: true,
  })
);

// Apply auth middleware to all routes
app.use("/ai-insights/*", extractUserAndOrgId);

app.options("*", (c) => {
  return c.text("", 200);
});

// Helper function to get supabase client and org info
async function getSupabaseAndOrgInfo(orgId: string, userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Get organization details
  const org = await supabase
    .schema("private")
    .from("organizations")
    .select("*")
    .eq("clerk_organization_id", orgId)
    .single();
  if (org.error) {
    throw new Error("Organization not found");
  }
  const schema = org.data?.schema_name.toLowerCase();
  if (!schema) {
    throw new Error("Organization schema not found");
  }

  // Verify user belongs to organization
  const user = await supabase
    .schema("private")
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();
  if (user.error) {
    throw new Error("User not found");
  }

  const member = await supabase
    .schema("private")
    .from("organization_members")
    .select("*")
    .eq("user_id", user.data?.id)
    .eq("organization_id", org.data?.id)
    .single();
  if (member.error) {
    throw new Error("Member not found");
  }

  return {
    supabase,
    schema,
    user: user.data,
    member: member.data,
    org: org.data,
  };
}

//GET /ai-insights/cases/{caseId}
app.get("/ai-insights/cases/:caseId", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .select(
        `
          *,
          case:cases(*),
          task:case_tasks(*)
        `
      )
      .eq("case_id", caseId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//GET /ai-insights/projects/{projectId}
app.get("/ai-insights/projects/:projectId", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const projectId = c.req.param("projectId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .select(
        `
          *,
          project:projects(*),
          task:case_tasks(*)
        `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//GET /ai-insights/pending
app.get("/ai-insights/pending", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .select(
          `
          *,
          case:cases(*),
          project:projects(*),
          task:case_tasks(*)
         )
        `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//GET /ai-insights/tasks/{taskId}
app.get("/ai-insights/tasks/:taskId", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//GET /ai-insights/{insightId}
app.get("/ai-insights/:insightId", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const insightId = c.req.param("insightId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .select(
        `
          *,
          case:cases(*),
          project:projects(*),
          task:case_tasks(*)
        `
      )
      .eq("id", insightId)
      .single();

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//GET /ai-insights/stats
app.get("/ai-insights/stats", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .select("status, source_type, confidence_score");

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter((d) => d.status === "pending").length,
      accepted: data.filter((d) => d.status === "accepted").length,
      rejected: data.filter((d) => d.status === "rejected").length,
      high_confidence: data.filter((d) => d.confidence_score >= 0.8).length,
      by_source: data.reduce((acc, d) => {
        if (d.source_type) {
          acc[d.source_type] = (acc[d.source_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
    };

    return c.json(stats, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//POST /ai-insights/create
app.post("/ai-insights/create", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    const body: AITaskInsightCreateData = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("ai_task_insights")
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 201);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//POST /ai-insights/review

app.post("/ai-insights/review", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    const body: ReviewAITaskRequest = await c.req.json();

    if (body.decision === "accept") {
      // Use the database function to accept the suggestion
      const { data, error } = await supabase
        .schema(schema)
        .rpc("accept_ai_suggestion", {
          p_insight_id: body.insight_id,
          p_user_id: user.id,
        });

      if (error) throw error;

      return c.json({ task_id: data }, 200);
    } else {
      // Use the database function to reject the suggestion
      const { error } = await supabase
        .schema(schema)
        .rpc("reject_ai_suggestion", {
          p_insight_id: body.insight_id,
          p_user_id: user.id,
          p_reason: body.reason || null,
        });

      if (error) throw error;

      return c.json({ success: true }, 200);
    }
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

//POST /ai-insights/bulk-review
app.post("/ai-insights/bulk-review", async (c: any) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    const body: BulkReviewRequest = await c.req.json();

    const results = [];

    for (const insightId of body.insight_ids) {
      try {
        if (body.decision === "accept") {
          const { data, error } = await supabase
            .schema(schema)
            .rpc("accept_ai_suggestion", {
              p_insight_id: insightId,
              p_user_id: user.id,
            });
          if (error) throw error;
          results.push(data);
        } else {
          const { error } = await supabase
            .schema(schema)
            .rpc("reject_ai_suggestion", {
              p_insight_id: insightId,
              p_user_id: user.id,
              p_reason: body.reason || null,
            });
          if (error) throw error;
        }
      } catch (error) {
        console.error(`Error processing insight ${insightId}:`, error);
        // Continue with other insights even if one fails
      }
    }

    return c.json({ task_ids: results }, 200);
  } catch (error: any) {
    console.error("AI Insights API Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
