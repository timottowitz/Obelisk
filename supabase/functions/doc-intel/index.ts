// Document Intelligence API Endpoints
// Handles document upload, management, and entity operations

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { 
  createUploadValidationMiddleware, 
  createApiValidationMiddleware,
  getRateLimitStatus 
} from "../_shared/validation-middleware.ts";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";

const app = new Hono();

// Configure CORS with proper options handling
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id", "X-Forwarded-For", "CF-Connecting-IP"],
    credentials: true,
  })
);

// Handle OPTIONS requests for all routes
app.options("*", (c) => {
  return c.text("", 200);
});

// Apply validation middleware before authentication
// Upload endpoints need special handling for file size limits
app.use("/upload", createUploadValidationMiddleware({
  maxRequestSize: 50 * 1024 * 1024, // 50MB limit matching P1 security requirements
  maxFormDataSize: 50 * 1024 * 1024, // Consistent 50MB limit for form data
  rateLimitMaxRequests: 20, // Lower limit for uploads
  rateLimitWindow: 60 * 1000 // 1 minute
}));

// API endpoints get standard validation
app.use("*", createApiValidationMiddleware({
  skipPathsForAuth: ["/health", "/status"],
  rateLimitMaxRequests: 100,
  rateLimitWindow: 60 * 1000
}));

// Middleware for user and org extraction (after validation)
app.use("*", extractUserAndOrgId);

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

// Helper function to validate file content against MIME type using magic numbers
// Enhanced for P1 security to prevent file type spoofing attacks
function validateFileContent(fileData: Uint8Array, mimeType: string): boolean {
  try {
    // Magic number validation for supported document types only
    const magicNumbers = {
      'application/pdf': [0x25, 0x50, 0x44, 0x46],                 // %PDF
      'application/zip': [0x50, 0x4B, 0x03, 0x04],                 // ZIP (used by DOCX)
      'application/msword': [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] // DOC (OLE compound document)
    };
    
    // Validate PDF files
    if (mimeType === 'application/pdf') {
      const pdfMagic = magicNumbers['application/pdf'];
      return pdfMagic.every((byte, index) => fileData[index] === byte);
    }
    
    // Validate DOCX files (ZIP-based format)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const zipMagic = magicNumbers['application/zip'];
      return zipMagic.every((byte, index) => fileData[index] === byte);
    }
    
    // Validate legacy DOC files (OLE compound document)
    if (mimeType === 'application/msword') {
      const docMagic = magicNumbers['application/msword'];
      return docMagic.every((byte, index) => fileData[index] === byte);
    }
    
    // For text files, perform basic validation
    if (mimeType === 'text/plain') {
      // Check if file contains valid text characters (no null bytes in first 512 bytes)
      const sampleSize = Math.min(512, fileData.length);
      for (let i = 0; i < sampleSize; i++) {
        if (fileData[i] === 0) {
          return false; // Null bytes indicate binary content, not text
        }
      }
      return true;
    }
    
    // Only allow explicitly supported types
    return false;
  } catch (error) {
    console.error('File validation error:', error);
    // Fail securely - reject on validation error for P1 security
    return false;
  }
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

// POST /upload - Handle file upload with P1 security validation
// Implements BE-008: Server-side file validation (size/type) to complement FE-005
// Security features:
// - Server-side file size validation (50MB limit) 
// - Server-side file type validation (PDF, DOCX, DOC, TXT only)
// - Magic number content validation to prevent type spoofing
// - Validation cannot be bypassed by manipulating client-side code
app.post("/upload", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    
    const supabase = getSupabaseClient();
    const gcsService = getGcsService();
    
    // Get organization info
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);
    
    // Parse multipart form data with additional validation
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    
    if (!file || !(file instanceof File)) {
      return c.json({ 
        success: false,
        error: "No valid file provided",
        code: "INVALID_FILE"
      }, 400);
    }
    
    // Server-side file type validation - matches client-side rules from FE-005
    // Only allow document types as per P1 security requirements: PDF, DOCX, DOC, TXT
    const allowedMimeTypes = [
      'application/pdf',                                                          // PDF files
      'application/msword',                                                       // Legacy DOC files  
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX files
      'text/plain'                                                               // TXT files
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: `File type '${file.type}' is not supported. Only PDF, DOCX, DOC, and TXT files are allowed.`,
        code: "UNSUPPORTED_FILE_TYPE",
        allowedTypes: ['PDF', 'DOCX', 'DOC', 'TXT'],
        receivedType: file.type
      }, 415);
    }
    
    // Server-side file size validation - 50MB limit as per P1 security requirements
    // This provides security even if client-side validation is bypassed
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
      return c.json({
        success: false,
        error: `File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds maximum allowed 50 MB`,
        code: "FILE_TOO_LARGE",
        maxSizeBytes: maxFileSize,
        maxSizeMB: 50,
        receivedSizeBytes: file.size,
        receivedSizeMB: parseFloat((file.size / (1024 * 1024)).toFixed(2))
      }, 413);
    }

    // Convert file to buffer with error handling
    let arrayBuffer: ArrayBuffer;
    let fileData: Uint8Array;
    
    try {
      arrayBuffer = await file.arrayBuffer();
      fileData = new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Error reading file data:", error);
      return c.json({ 
        success: false,
        error: "Failed to read file data",
        code: "FILE_READ_ERROR"
      }, 400);
    }

    if (!fileData?.length) {
      return c.json({ 
        success: false,
        error: "Empty or invalid file data",
        code: "EMPTY_FILE"
      }, 400);
    }
    
    // Server-side file content validation using magic numbers - P1 security feature
    // Prevents file type spoofing attacks where malicious files masquerade as documents
    if (!validateFileContent(fileData, file.type)) {
      return c.json({
        success: false,
        error: `File content validation failed. The file does not appear to be a valid ${file.type.split('/')[1].toUpperCase()} file.`,
        code: "INVALID_FILE_CONTENT",
        declaredType: file.type,
        hint: "File may be corrupted or the file extension may not match the actual content"
      }, 400);
    }

    // Calculate checksum for integrity
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Create document record first to get doc_id for secure path
    const { data: document, error: docError } = await supabase
      .schema(schema)
      .from("documents")
      .insert({
        filename: file.name,
        status: "uploading",
        user_id: user.id,
        metadata: {
          originalSize: fileData.length,
          mimeType: file.type,
          checksum,
        }
      })
      .select()
      .single();

    if (docError) {
      console.error("Error creating document record:", docError);
      return c.json({ error: "Failed to create document record" }, 500);
    }

    // Upload to GCS with secure tenant path: tenant/<tenant_id>/documents/<doc_id>/*
    const uploadResult = await gcsService.uploadFile(
      orgId,
      userId,
      `documents/${document.id}`, // secure folder path with doc_id
      file.name,
      fileData,
      file.type || "application/octet-stream",
      { checksum, uploadedBy: user.id }
    );

    // Update document record with file path and metadata
    const { data: updatedDocument, error: updateError } = await supabase
      .schema(schema)
      .from("documents")
      .update({
        file_path: uploadResult.blobName,
        metadata: {
          originalSize: fileData.length,
          mimeType: file.type,
          checksum,
          gcsUrl: uploadResult.blobUrl,
        }
      })
      .eq("id", document.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating document record:", updateError);
      return c.json({ error: "Failed to update document record" }, 500);
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
        id: updatedDocument.id,
        filename: updatedDocument.filename,
        status: "processing",
        uploaded_at: updatedDocument.uploaded_at,
        metadata: updatedDocument.metadata
      },
      message: "Document uploaded and processing started successfully"
    }, 201);
  } catch (error: any) {
    console.error("Upload error:", error);
    
    // Security: Don't expose internal errors in production
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    
    return c.json({ 
      success: false, 
      error: isDevelopment ? error.message : "Internal server error during upload",
      code: "UPLOAD_ERROR",
      timestamp: new Date().toISOString()
    }, 500);
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
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to fetch documents",
      code: "FETCH_DOCUMENTS_ERROR"
    }, 500);
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
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to fetch document",
      code: "FETCH_DOCUMENT_ERROR"
    }, 500);
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
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to fetch entities",
      code: "FETCH_ENTITIES_ERROR"
    }, 500);
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
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to update entity",
      code: "UPDATE_ENTITY_ERROR"
    }, 500);
  }
});

// GET /documents/:id/download - Generate signed URL for secure document access
app.get("/documents/:id/download", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const documentId = c.req.param("id");
    
    const supabase = getSupabaseClient();
    const gcsService = getGcsService();
    const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

    // Verify document exists and user has access
    const { data: document, error: docError } = await supabase
      .schema(schema)
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return c.json({ error: "Document not found or access denied" }, 404);
    }

    // Ensure document has a file path
    if (!document.file_path) {
      return c.json({ error: "Document file not available" }, 404);
    }

    // Generate signed URL with 1 hour expiration (max security requirement)
    const signedUrl = await gcsService.generateSignedUrl(
      document.file_path,
      1 // 1 hour maximum as per security requirements
    );

    return c.json({
      success: true,
      signedUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      document: {
        id: document.id,
        filename: document.filename,
        mimeType: document.metadata?.mimeType,
        size: document.metadata?.originalSize
      }
    });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to generate download URL",
      code: "DOWNLOAD_URL_ERROR"
    }, 500);
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
    
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    return c.json({ 
      success: false,
      error: isDevelopment ? error.message : "Failed to set objective truth",
      code: "SET_OBJECTIVE_TRUTH_ERROR"
    }, 500);
  }
});

// Health check endpoint
app.get("/health", async (c) => {
  return c.json({
    status: "healthy",
    service: "doc-intel",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Rate limit status endpoint
app.get("/rate-limit-status", async (c) => {
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
      clientIP: clientIP.substring(0, 8) + "...", // Partial IP for privacy
    });
  } catch (error) {
    return c.json({
      success: false,
      error: "Failed to get rate limit status"
    }, 500);
  }
});

export default app;