// Document Intelligence API Endpoints
// Handles document upload, management, and entity operations

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";

const app = new Hono();

// Configure CORS with proper options handling
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id"],
    credentials: true,
  })
);

// Middleware for user and org extraction
app.use("*", extractUserAndOrgId);

// Handle OPTIONS requests for all routes
app.options("*", (c) => {
  return c.text("", 200);
});

// Get Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    }
  );
}

// Get GCS service
function getGcsService() {
  const gcsKeyRaw = Deno.env.get("GCS_JSON_KEY");
  const bucketName = Deno.env.get("GCS_BUCKET_NAME");
  if (!gcsKeyRaw || !bucketName) {
    throw new Error(
      "GCS storage not configured. Please set GCS_JSON_KEY and GCS_BUCKET_NAME in environment variables."
    );
  }
  let credentials;
  try {
    credentials = JSON.parse(gcsKeyRaw);
  } catch (e: any) {
    throw new Error("Invalid GCS_JSON_KEY: " + (e?.message || e));
  }
  return new GoogleCloudStorageService({ bucketName, credentials });
}

// Helper function to get organization info
async function getOrganizationInfo(supabase: any, orgId: string, userId: string) {
  const { data: org, error: orgError } = await supabase
    .schema("private")
    .from("organizations")
    .select("*")
    .eq("clerk_organization_id", orgId)
    .single();

  if (orgError || !org) {
    throw new Error("Organization not found");
  }

  const { data: user, error: userError } = await supabase
    .schema("private")
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  const { data: member, error: memberError } = await supabase
    .schema("private")
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .single();

  if (memberError || !member) {
    throw new Error("User is not a member of this organization");
  }

  return {
    org,
    user,
    member,
    schema: org.schema_name.toLowerCase(),
  };
}

// POST /upload - Handle file upload
app.post("/upload", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    
    const supabase = getSupabaseClient();
    const gcsService = getGcsService();
    
    // Get organization info
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No valid file provided" }, 400);
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    if (!fileData?.length) {
      return c.json({ error: "Empty or invalid file data" }, 400);
    }

    // Calculate checksum for integrity
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Upload to GCS
    const uploadResult = await gcsService.uploadFile(
      orgId,
      userId,
      "doc-intel", // folder path
      file.name,
      fileData,
      file.type || "application/octet-stream",
      { checksum, uploadedBy: user.id }
    );

    // Create document record
    const { data: document, error: docError } = await supabase
      .schema(schema)
      .from("documents")
      .insert({
        filename: file.name,
        status: "uploading",
        user_id: user.id,
        file_path: uploadResult.blobName,
        metadata: {
          originalSize: fileData.length,
          mimeType: file.type,
          checksum,
          gcsUrl: uploadResult.blobUrl,
        }
      })
      .select()
      .single();

    if (docError) {
      console.error("Error creating document record:", docError);
      return c.json({ error: "Failed to create document record" }, 500);
    }

    // Create processing job
    const { data: job, error: jobError } = await supabase
      .schema(schema)
      .from("doc_intel_job_queue")
      .insert({
        job_type: "extract",
        document_id: document.id,
        user_id: user.id,
        pipeline_config: {
          operations: ["extract_text", "extract_entities"],
          output_format: "json"
        },
        input_data: {
          file_path: uploadResult.blobName,
          filename: file.name,
          mime_type: file.type
        },
        priority: 0,
        metadata: {
          original_filename: file.name,
          upload_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating processing job:", jobError);
      // Still return success since document was created
    }

    // Update document status to processing
    await supabase
      .schema(schema)
      .from("documents")
      .update({ status: "processing" })
      .eq("id", document.id);

    return c.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        status: "processing",
        uploaded_at: document.uploaded_at,
        metadata: document.metadata
      }
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /documents - List all documents for current user
app.get("/documents", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    
    const supabase = getSupabaseClient();
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

    // Parse query parameters
    const url = new URL(c.req.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const search = url.searchParams.get("search");

    // Build query
    let query = supabase
      .schema(schema)
      .from("documents")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`filename.ilike.%${search}%,extracted_text.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order("uploaded_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      return c.json({ error: "Failed to fetch documents" }, 500);
    }

    return c.json({
      success: true,
      documents: documents || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("Error in documents endpoint:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /documents/:id - Get single document details
app.get("/documents/:id", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const documentId = c.req.param("id");
    
    const supabase = getSupabaseClient();
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

    // Get document with entity count
    const { data: document, error: docError } = await supabase
      .schema(schema)
      .from("documents")
      .select(`
        *,
        entities!document_id (
          id,
          label,
          value,
          status,
          is_objective_truth
        )
      `)
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Calculate entity statistics
    const entities = document.entities || [];
    const entityStats = {
      total: entities.length,
      confirmed: entities.filter((e: any) => e.status === "confirmed").length,
      pending: entities.filter((e: any) => e.status === "pending").length,
      rejected: entities.filter((e: any) => e.status === "rejected").length,
      objective_truth: entities.filter((e: any) => e.is_objective_truth).length,
    };

    return c.json({
      success: true,
      document: {
        ...document,
        entity_stats: entityStats
      }
    });
  } catch (error: any) {
    console.error("Error fetching document:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /documents/:id/entities - Get all entities for a document
app.get("/documents/:id/entities", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const documentId = c.req.param("id");
    
    const supabase = getSupabaseClient();
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

    // Parse query parameters
    const url = new URL(c.req.url);
    const status = url.searchParams.get("status");
    const label = url.searchParams.get("label");
    const is_objective_truth = url.searchParams.get("is_objective_truth");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .schema(schema)
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Build entities query
    let query = supabase
      .schema(schema)
      .from("entities")
      .select("*", { count: "exact" })
      .eq("document_id", documentId);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (label) {
      query = query.eq("label", label);
    }

    if (is_objective_truth !== null) {
      query = query.eq("is_objective_truth", is_objective_truth === "true");
    }

    // Apply pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: entities, error, count } = await query;

    if (error) {
      console.error("Error fetching entities:", error);
      return c.json({ error: "Failed to fetch entities" }, 500);
    }

    return c.json({
      success: true,
      entities: entities || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("Error fetching entities:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /entities/:id - Update entity status
app.patch("/entities/:id", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const entityId = c.req.param("id");
    
    const supabase = getSupabaseClient();
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

    // Parse request body
    const body = await c.req.json();
    const { status, label, value, context_snippet, coordinates_json } = body;

    // Validate status if provided
    if (status && !["pending", "confirmed", "rejected"].includes(status)) {
      return c.json({ error: "Invalid status. Must be one of: pending, confirmed, rejected" }, 400);
    }

    // Verify entity exists and user has access via document ownership
    const { data: entity, error: entityError } = await supabase
      .schema(schema)
      .from("entities")
      .select(`
        *,
        documents!inner(user_id)
      `)
      .eq("id", entityId)
      .eq("documents.user_id", user.id)
      .single();

    if (entityError || !entity) {
      return c.json({ error: "Entity not found" }, 404);
    }

    // Build update object
    const updateData: any = {};
    if (status) updateData.status = status;
    if (label) updateData.label = label;
    if (value) updateData.value = value;
    if (context_snippet !== undefined) updateData.context_snippet = context_snippet;
    if (coordinates_json !== undefined) updateData.coordinates_json = coordinates_json;

    // Update entity
    const { data: updatedEntity, error: updateError } = await supabase
      .schema(schema)
      .from("entities")
      .update(updateData)
      .eq("id", entityId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating entity:", updateError);
      return c.json({ error: "Failed to update entity" }, 500);
    }

    return c.json({
      success: true,
      entity: updatedEntity
    });
  } catch (error: any) {
    console.error("Error updating entity:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /entities/:id/set-objective-truth - Set objective truth flag
app.post("/entities/:id/set-objective-truth", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const entityId = c.req.param("id");
    
    const supabase = getSupabaseClient();
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

    // Parse request body
    const body = await c.req.json();
    const { is_objective_truth } = body;

    if (typeof is_objective_truth !== "boolean") {
      return c.json({ error: "is_objective_truth must be a boolean" }, 400);
    }

    // Verify entity exists and user has access via document ownership
    const { data: entity, error: entityError } = await supabase
      .schema(schema)
      .from("entities")
      .select(`
        *,
        documents!inner(user_id)
      `)
      .eq("id", entityId)
      .eq("documents.user_id", user.id)
      .single();

    if (entityError || !entity) {
      return c.json({ error: "Entity not found" }, 404);
    }

    // Update entity objective truth status
    const { data: updatedEntity, error: updateError } = await supabase
      .schema(schema)
      .from("entities")
      .update({ 
        is_objective_truth,
        status: is_objective_truth ? "confirmed" : entity.status // Auto-confirm if setting as objective truth
      })
      .eq("id", entityId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating entity objective truth:", updateError);
      return c.json({ error: "Failed to update entity" }, 500);
    }

    return c.json({
      success: true,
      entity: updatedEntity
    });
  } catch (error: any) {
    console.error("Error setting objective truth:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;