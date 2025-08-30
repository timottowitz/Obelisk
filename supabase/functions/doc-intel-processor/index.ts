// DocETL Processor Edge Function
// Handles asynchronous document processing jobs using a job queue pattern
// Supports long-running tasks with proper timeout handling and retry logic

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { createJobProcessor, DocETLJobProcessor, DocETLJob } from "./job-processor.ts";
import { 
  createApiValidationMiddleware, 
  createWebhookValidationMiddleware,
  getRateLimitStatus 
} from "../_shared/validation-middleware.ts";

const app = new Hono();

// Worker ID for this instance
const WORKER_ID = `worker-${crypto.randomUUID()}`;

// Configure CORS
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id", "X-Forwarded-For", "CF-Connecting-IP", "x-webhook-signature"],
    credentials: true,
  })
);

// Apply validation middleware before authentication
// Webhook endpoints might need HMAC validation
app.use("/doc-intel-processor/webhook/*", createWebhookValidationMiddleware({
  rateLimitMaxRequests: 1000, // Higher limit for webhooks
  rateLimitWindow: 60 * 1000
}));

// API endpoints get standard validation  
app.use("/doc-intel-processor/*", createApiValidationMiddleware({
  skipPathsForAuth: ["/doc-intel-processor/health"],
  rateLimitMaxRequests: 200,
  rateLimitWindow: 60 * 1000
}));

// Apply middleware for authenticated routes (after validation)
app.use("/doc-intel-processor/jobs", extractUserAndOrgId);
app.use("/doc-intel-processor/jobs/*", extractUserAndOrgId);
app.use("/doc-intel-processor/process", extractUserAndOrgId);
app.use("/doc-intel-processor/status/*", extractUserAndOrgId);

app.options("*", (c) => {
  return c.text("", 200);
});

// Health check endpoint
app.get("/doc-intel-processor/health", async (c) => {
  return c.json({ 
    status: "healthy", 
    service: "doc-intel-processor",
    worker_id: WORKER_ID,
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// GET /doc-intel-processor/jobs - List jobs for the user
app.get("/doc-intel-processor/jobs", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization schema
    const { schema, error: orgError } = await getOrganizationSchema(supabase, orgId, userId);
    if (orgError) {
      return c.json({ error: orgError }, 404);
    }

    // Parse query parameters
    const url = new URL(c.req.url);
    const status = url.searchParams.get("status");
    const jobType = url.searchParams.get("job_type");
    const documentId = url.searchParams.get("document_id");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .schema(schema)
      .from("doc_intel_job_queue")
      .select(`
        *,
        documents!inner(id, filename, status as doc_status)
      `, { count: "exact" })
      .eq("user_id", userId);

    if (status) {
      query = query.eq("status", status);
    }
    if (jobType) {
      query = query.eq("job_type", jobType);
    }
    if (documentId) {
      query = query.eq("document_id", documentId);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error("Error fetching jobs:", error);
      return c.json({ error: "Failed to fetch jobs" }, 500);
    }

    return c.json({
      jobs: jobs || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("Error in jobs endpoint:", error);
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to fetch jobs",
      code: "FETCH_JOBS_ERROR"
    }, 500);
  }
});

// GET /doc-intel-processor/status/:id - Get job status and logs
app.get("/doc-intel-processor/status/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const jobId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization schema
    const { schema, error: orgError } = await getOrganizationSchema(supabase, orgId, userId);
    if (orgError) {
      return c.json({ error: orgError }, 404);
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .schema(schema)
      .from("doc_intel_job_queue")
      .select(`
        *,
        documents!inner(id, filename, status as doc_status)
      `)
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();

    if (jobError || !job) {
      return c.json({ error: "Job not found" }, 404);
    }

    // Get job logs
    const { data: logs, error: logsError } = await supabase
      .schema(schema)
      .from("doc_intel_job_logs")
      .select("*")
      .eq("job_id", jobId)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (logsError) {
      console.error("Error fetching job logs:", logsError);
    }

    // Get heartbeat info
    const { data: heartbeat, error: heartbeatError } = await supabase
      .schema(schema)
      .from("doc_intel_job_heartbeats")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (heartbeatError) {
      console.error("Error fetching heartbeat:", heartbeatError);
    }

    return c.json({
      job,
      logs: logs || [],
      heartbeat: heartbeat || null,
      is_alive: heartbeat ? 
        (Date.now() - new Date(heartbeat.last_ping).getTime() < 120000) : // 2 minutes
        false
    });
  } catch (error: any) {
    console.error("Error in status endpoint:", error);
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to fetch job status",
      code: "FETCH_STATUS_ERROR"
    }, 500);
  }
});

// POST /doc-intel-processor/jobs - Create a new job
app.post("/doc-intel-processor/jobs", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization schema
    const { schema, error: orgError } = await getOrganizationSchema(supabase, orgId, userId);
    if (orgError) {
      return c.json({ error: orgError }, 404);
    }

    // Parse request body
    const body = await c.req.json();
    const {
      job_type,
      document_id,
      pipeline_config,
      input_data = {},
      priority = 0,
      metadata = {}
    } = body;

    // Enhanced input validation
    if (!job_type || !document_id || !pipeline_config) {
      return c.json({
        success: false,
        error: "Missing required fields: job_type, document_id, pipeline_config",
        code: "MISSING_REQUIRED_FIELDS",
        requiredFields: ["job_type", "document_id", "pipeline_config"]
      }, 400);
    }

    // Validate job_type
    const validJobTypes = ['extract', 'transform', 'pipeline'];
    if (!validJobTypes.includes(job_type)) {
      return c.json({
        success: false,
        error: "Invalid job_type. Must be one of: extract, transform, pipeline",
        code: "INVALID_JOB_TYPE",
        validTypes: validJobTypes,
        received: job_type
      }, 400);
    }
    
    // Validate pipeline_config structure
    if (typeof pipeline_config !== 'object' || pipeline_config === null) {
      return c.json({
        success: false,
        error: "pipeline_config must be a valid object",
        code: "INVALID_PIPELINE_CONFIG"
      }, 400);
    }
    
    // Validate priority range
    if (priority !== undefined && (typeof priority !== 'number' || priority < 0 || priority > 10)) {
      return c.json({
        success: false,
        error: "priority must be a number between 0 and 10",
        code: "INVALID_PRIORITY",
        validRange: [0, 10]
      }, 400);
    }

    // Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .schema(schema)
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .schema(schema)
      .from("doc_intel_job_queue")
      .insert({
        job_type,
        document_id,
        user_id: userId,
        pipeline_config,
        input_data,
        priority,
        metadata,
        total_steps: job_type === 'pipeline' ? 4 : 2 // pipeline has more steps
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
      return c.json({ error: "Failed to create job" }, 500);
    }

    // Log job creation
    await supabase.rpc("create_doc_intel_job_log", {
      p_job_id: job.id,
      p_level: "info",
      p_message: `Job created: ${job_type} for document ${document.filename}`,
      p_details: { job_type, document_id, priority }
    });

    return c.json({ 
      success: true,
      job: {
        id: job.id,
        job_type: job.job_type,
        document_id: job.document_id,
        status: job.status,
        created_at: job.created_at
      }
    }, 201);
  } catch (error: any) {
    console.error("Error creating job:", error);
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Internal server error during job creation",
      code: "JOB_CREATION_ERROR",
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// POST /doc-intel-processor/process - Process next available job
app.post("/doc-intel-processor/process", async (c) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse request body for optional job types filter
    const body = await c.req.json().catch(() => ({}));
    const { job_types = null } = body;

    // Claim next job from any tenant schema
    const job = await claimNextJob(supabase, WORKER_ID, job_types);
    
    if (!job) {
      return c.json({ message: "No jobs available" }, 204);
    }

    // Get the schema for this job's organization
    const { data: org, error: orgError } = await supabase
      .schema("private")
      .from("organizations")
      .select("schema_name")
      .eq("id", (await supabase
        .schema("private")
        .from("users")
        .select("organization_members!inner(organization_id)")
        .eq("id", job.user_id)
        .single()
      ).data?.organization_members?.organization_id)
      .single();

    if (orgError || !org) {
      console.error("Error getting organization for job:", orgError);
      return c.json({ error: "Could not determine organization" }, 500);
    }

    const schema = org.schema_name.toLowerCase();

    // Create job processor
    const processor = createJobProcessor({
      supabase,
      schema,
      workerId: WORKER_ID
    });

    // Process the job
    const result = await processor.processJob(job);

    if (result.success) {
      return c.json({
        success: true,
        job_id: job.id,
        message: "Job processed successfully",
        result: {
          output_data: result.output_data,
          result_file_path: result.result_file_path
        }
      });
    } else {
      return c.json({
        success: false,
        job_id: job.id,
        message: "Job processing failed",
        error: result.error_message
      }, 500);
    }
  } catch (error: any) {
    console.error("Error in process endpoint:", error);
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to process job",
      code: "PROCESS_JOB_ERROR"
    }, 500);
  }
});

// PUT /doc-intel-processor/jobs/:id/cancel - Cancel a job
app.put("/doc-intel-processor/jobs/:id/cancel", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const jobId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization schema
    const { schema, error: orgError } = await getOrganizationSchema(supabase, orgId, userId);
    if (orgError) {
      return c.json({ error: orgError }, 404);
    }

    // Update job status to cancelled
    const { data: job, error: jobError } = await supabase
      .schema(schema)
      .from("doc_intel_job_queue")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId)
      .eq("user_id", userId)
      .eq("status", "pending") // Can only cancel pending jobs
      .select()
      .single();

    if (jobError || !job) {
      return c.json({ error: "Job not found or cannot be cancelled" }, 404);
    }

    // Log cancellation
    await supabase.rpc("create_doc_intel_job_log", {
      p_job_id: jobId,
      p_level: "info",
      p_message: "Job cancelled by user"
    });

    return c.json({
      success: true,
      message: "Job cancelled successfully"
    });
  } catch (error: any) {
    console.error("Error cancelling job:", error);
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to cancel job",
      code: "CANCEL_JOB_ERROR"
    }, 500);
  }
});

// Helper function to get organization schema
async function getOrganizationSchema(supabase: any, orgId: string, userId: string): Promise<{ schema?: string, error?: string }> {
  try {
    // Get organization
    const { data: org, error: orgError } = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (orgError || !org) {
      return { error: "Organization not found" };
    }

    // Verify user is member
    const { data: user, error: userError } = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return { error: "User not found" };
    }

    const { data: member, error: memberError } = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", org.id)
      .single();

    if (memberError || !member) {
      return { error: "Member not found" };
    }

    return { schema: org.schema_name.toLowerCase() };
  } catch (error) {
    return { error: "Failed to get organization schema" };
  }
}

// Helper function to claim next job across all tenant schemas
async function claimNextJob(supabase: any, workerId: string, jobTypes: string[] | null): Promise<DocETLJob | null> {
  try {
    // Get all active organizations to check their job queues
    const { data: orgs, error: orgsError } = await supabase
      .schema("private")
      .from("organizations")
      .select("id, schema_name")
      .eq("is_active", true);

    if (orgsError || !orgs || orgs.length === 0) {
      console.log("No active organizations found");
      return null;
    }

    // Try to claim a job from each organization's schema
    for (const org of orgs) {
      const schema = org.schema_name.toLowerCase();
      
      try {
        const { data: jobs, error: jobError } = await supabase.rpc("claim_next_doc_intel_job", {
          p_worker_id: workerId,
          p_job_types: jobTypes
        });

        if (jobError) {
          console.error(`Error claiming job from schema ${schema}:`, jobError);
          continue;
        }

        if (jobs && jobs.length > 0) {
          const job = jobs[0];
          
          // Get additional job details
          const { data: fullJob, error: fullJobError } = await supabase
            .schema(schema)
            .from("doc_intel_job_queue")
            .select("*")
            .eq("id", job.job_id)
            .single();

          if (fullJobError) {
            console.error(`Error getting full job details:`, fullJobError);
            continue;
          }

          console.log(`Claimed job ${job.job_id} from schema ${schema}`);
          return fullJob;
        }
      } catch (schemaError) {
        console.error(`Error processing schema ${schema}:`, schemaError);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error in claimNextJob:", error);
    return null;
  }
}

// Rate limit status endpoint
app.get("/doc-intel-processor/rate-limit-status", async (c) => {
  try {
    const clientIP = c.req.header("cf-connecting-ip") || 
                    c.req.header("x-forwarded-for") || 
                    c.req.header("x-real-ip") || 
                    "unknown";
    
    const userId = c.get("userId") || "";
    const rateLimitStatus = getRateLimitStatus(clientIP, userId);
    
    return c.json({
      success: true,
      rateLimit: rateLimitStatus,
      worker_id: WORKER_ID,
      clientIP: clientIP.substring(0, 8) + "...", // Partial IP for privacy
    });
  } catch (error) {
    return c.json({
      success: false,
      error: "Failed to get rate limit status"
    }, 500);
  }
});

// Webhook endpoint for external processing notifications
app.post("/doc-intel-processor/webhook/process-complete", async (c) => {
  try {
    // HMAC validation is handled by middleware
    const body = await c.req.json();
    
    // Validate webhook payload structure
    const { job_id, status, result_data, error_message } = body;
    
    if (!job_id || !status) {
      return c.json({
        success: false,
        error: "Missing required webhook fields: job_id, status",
        code: "INVALID_WEBHOOK_PAYLOAD"
      }, 400);
    }
    
    const validStatuses = ['completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: "Invalid status in webhook",
        code: "INVALID_WEBHOOK_STATUS",
        validStatuses
      }, 400);
    }
    
    // Process webhook (update job status, etc.)
    // This would typically update the job in the database
    console.log(`Webhook received for job ${job_id}: ${status}`);
    
    return c.json({
      success: true,
      message: "Webhook processed successfully",
      job_id,
      processed_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    
    return c.json({
      success: false,
      error: "Failed to process webhook",
      code: "WEBHOOK_PROCESSING_ERROR"
    }, 500);
  }
});

export default app;