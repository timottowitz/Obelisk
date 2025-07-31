// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";

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

// Middleware for user and org extraction
app.use("*", extractUserAndOrgId);

// Handle OPTIONS requests for all routes
app.options("*", (c) => {
  return c.text("", 200);
});

// Place getGcsService at the top so it's in scope for all endpoints
function getGcsService(bucketNameOverride?: string) {
  const gcsKeyRaw = Deno.env.get("GCS_JSON_KEY");
  const bucketName = bucketNameOverride || Deno.env.get("GCS_BUCKET_NAME");
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

// Get Supabase client with tenant schema
async function getSupabaseClient() {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    }
  );

  return supabaseClient;
}

// File upload endpoint
app.post("/storage/upload", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const buffer = await file.arrayBuffer();
    const fileData = new Uint8Array(buffer);

    const folderId = formData.get("folderId") as string;
    const fileName = file.name;
    const mimeType = file.type;
    // const body = await c.req.json();
    // const { folderId, fileName, fileData, mimeType } = body;

    if (!fileName || !fileData || !mimeType) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabaseClient = await getSupabaseClient();
    const gcsService = getGcsService("storage");

    const result = await handleFileUpload(supabaseClient, gcsService, {
      userId,
      folderId,
      fileName,
      fileData,
      mimeType,
      tenantId: orgId,
      schema: orgId,
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// File download endpoint
app.get("/storage/download/:fileId", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const fileId = c.req.param("fileId");

    if (!fileId) {
      return c.json({ error: "File ID required" }, 400);
    }

    const supabaseClient = await getSupabaseClient();
    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const gcsService = getGcsService();

    const result = await handleFileDownload(supabaseClient, gcsService, {
      userId,
      fileId,
      tenantId: orgId,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Download error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// File delete endpoint
app.delete("/storage/files/:fileId", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const fileId = c.req.param("fileId");

    if (!fileId) {
      return c.json({ error: "File ID required" }, 400);
    }

    const supabaseClient = await getSupabaseClient();
    const gcsService = getGcsService();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const result = await handleFileDelete(supabaseClient, gcsService, {
      userId: user.data?.id,
      fileId,
      tenantId: orgId,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Delete error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// List files and folders endpoint
app.get("/storage/list", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const folderId = c.req.query("folderId");

    const supabaseClient = await getSupabaseClient();
    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const result = await handleFileList(supabaseClient, {
      userId: user.data?.id,
      folderId,
      tenantId: org.data?.id,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("List error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create folder case endpoint
app.post("/storage/folder-cases", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const body = await c.req.json();
    const { folderCaseName } = body;
    console.log("Folder case name:", folderCaseName);

    const supabaseClient = await getSupabaseClient();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!folderCaseName) {
      return c.json({ error: "Folder case name required" }, 400);
    }

    const result = await handleCreateFolderCase(supabaseClient, {
      folderCaseName,
      userId: user.data?.id,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Create folder case error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get folder cases endpoint
app.get("/storage/folder-cases", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");

    const supabaseClient = await getSupabaseClient();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const result = await handleGetFolderCases(supabaseClient, {
      userId: user.data?.id,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Get folder cases error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create folder endpoint
app.post("/storage/folders", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const body = await c.req.json();
    const { folderId, folderName } = body;

    const supabaseClient = await getSupabaseClient();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!folderName) {
      return c.json({ error: "Folder name required" }, 400);
    }

    const result = await handleCreateFolder(supabaseClient, {
      userId: user.data?.id,
      folderId,
      folderName,
      tenantId: orgId,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Create folder error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/storage/folders/tree", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");

    const supabaseClient = await getSupabaseClient();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const result = await handleGetFolders(
      supabaseClient,
      user.data?.id,
      org.data?.schema_name.toLowerCase(),
      org.data?.id
    );

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Get folders error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete folder endpoint
app.delete("/storage/folders/:folderId", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const folderId = c.req.param("folderId");

    if (!folderId) {
      return c.json({ error: "Folder ID required" }, 400);
    }

    const supabaseClient = await getSupabaseClient();
    const gcsService = getGcsService();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const result = await handleDeleteFolder(supabaseClient, gcsService, {
      userId: user.data?.id,
      folderId,
      tenantId: orgId,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Delete folder error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Share resource endpoint
app.post("/storage/share", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const body = await c.req.json();
    const { resourceId, resourceType, shareWith, permission } = body;

    if (!resourceId || !resourceType || !shareWith || !permission) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabaseClient = await getSupabaseClient();

    const result = await handleShareResource(supabaseClient, {
      userId,
      resourceId,
      resourceType,
      shareWith,
      permission,
      tenantId: orgId,
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Share error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Unshare resource endpoint
app.delete("/storage/share", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const body = await c.req.json();
    const { resourceId, resourceType, shareWith } = body;

    if (!resourceId || !resourceType || !shareWith) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabaseClient = await getSupabaseClient();

    const result = await handleUnshareResource(supabaseClient, {
      userId,
      resourceId,
      resourceType,
      shareWith,
      tenantId: orgId,
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Unshare error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get file metadata endpoint
app.get("/storage/metadata/:fileId", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const fileId = c.req.param("fileId");

    if (!fileId) {
      return c.json({ error: "File ID required" }, 400);
    }

    const supabaseClient = await getSupabaseClient();

    const result = await handleGetMetadata(supabaseClient, {
      userId,
      fileId,
      tenantId: orgId,
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Get metadata error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Direct file upload endpoint (multipart form data)
app.post("/storage/upload-direct", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");

    // Parse multipart form data
    const formData = await c.req.parseBody();
    const file = formData["file"] as File;
    const folderId = formData["folderId"] as string;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No valid file provided" }, 400);
    }

    // Convert file to buffer
    let fileData: Uint8Array;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileData = new Uint8Array(arrayBuffer);
    } catch (err) {
      console.error("Error converting file to buffer:", err);
      return c.json({ error: "Error processing file" }, 400);
    }

    if (!fileData?.length) {
      return c.json({ error: "Empty or invalid file data" }, 400);
    }

    const supabaseClient = await getSupabaseClient();
    const gcsService = getGcsService();

    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const member = await supabaseClient
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data?.id)
      .eq("organization_id", org.data?.id)
      .single();

    const result = await handleDirectFileUpload(supabaseClient, gcsService, {
      userId: user.data?.id,
      folderId: folderId || undefined,
      fileName: file.name || "untitled",
      fileData,
      mimeType: file.type || "application/octet-stream",
      tenantId: orgId,
      uploadedBy: member.data?.id,
      schema: org.data?.schema_name.toLowerCase(),
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Direct upload error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Handler functions (same as before)

async function handleFileUpload(
  supabaseClient: any,
  gcsService: GoogleCloudStorageService,
  params: {
    userId: string;
    folderId?: string;
    fileName: string;
    fileData: Uint8Array;
    mimeType: string;
    tenantId: string;
    schema: string;
  }
) {
  const { userId, folderId, fileName, fileData, mimeType, tenantId, schema } =
    params;

  // Check if user has permission to upload to this folder
  if (folderId) {
    const hasPermission = await checkFolderPermission(
      supabaseClient,
      userId,
      folderId,
      "edit"
    );
    if (!hasPermission) {
      throw new Error("Insufficient permissions to upload to this folder");
    }
  }

  // Calculate checksum
  const checksum = await calculateChecksum(fileData);

  // Get folder path
  const folderPath = folderId
    ? await getFolderPath(supabaseClient, folderId, schema)
    : "root";

  // Upload to GCS
  const uploadResult = await gcsService.uploadFile(
    tenantId,
    userId,
    folderPath,
    fileName,
    fileData,
    mimeType,
    { checksum, uploadedBy: userId }
  );

  // Save file metadata to database
  const { data: fileRecord, error } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .insert({
      name: fileName,
      original_name: fileName,
      folder_id: folderId,
      gcs_blob_name: uploadResult.blobName,
      gcs_blob_url: uploadResult.blobUrl,
      mime_type: mimeType,
      size_bytes: fileData.length,
      checksum: checksum,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "upload",
    resourceType: "file",
    resourceId: fileRecord.id,
    details: { fileName, size: fileData.length, mimeType },
    schema,
  });

  return fileRecord;
}

async function handleFileDownload(
  supabaseClient: any,
  gcsService: GoogleCloudStorageService,
  params: {
    userId: string;
    fileId: string;
    tenantId: string;
    schema: string;
  }
) {
  const { userId, fileId, tenantId, schema } = params;

  // Get file record
  const { data: fileRecord, error } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (error || !fileRecord) {
    throw new Error("File not found");
  }

  // Check permissions
  // const hasPermission = await checkFilePermission(
  //   supabaseClient,
  //   userId,
  //   fileId,
  //   "view"
  // );
  // if (!hasPermission) {
  //   throw new Error("Insufficient permissions to download this file");
  // }

  // Download from GCS
  const fileData = await gcsService.downloadFile(fileRecord.gcs_blob_name);
  // Generate signed URL for direct access
  const signedUrl = await gcsService.generateSignedUrl(
    fileRecord.gcs_blob_name,
    1
  );

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "download",
    resourceType: "file",
    resourceId: fileId,
    details: { fileName: fileRecord.name },
    schema,
  });

  return {
    signedUrl,
    metadata: fileRecord,
  };
}

async function handleFileDelete(
  supabaseClient: any,
  gcsService: GoogleCloudStorageService,
  params: {
    userId: string;
    fileId: string;
    tenantId: string;
    schema: string;
  }
) {
  const { userId, fileId, tenantId, schema } = params;

  // Get file record
  const { data: fileRecord, error } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (error || !fileRecord) {
    throw new Error("File not found");
  }

  // Check permissions
  // const hasPermission = await checkFilePermission(
  //   supabaseClient,
  //   userId,
  //   fileId,
  //   "admin"
  // );
  // if (!hasPermission) {
  //   throw new Error("Insufficient permissions to delete this file");
  // }

  // Soft delete in database
  const { error: updateError } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId);

  if (updateError) throw updateError;

  console.log("successfully deleted file");

  // Delete from GCS
  await gcsService.deleteFile(fileRecord.gcs_blob_name);

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "delete",
    resourceType: "file",
    resourceId: fileId,
    details: { fileName: fileRecord.name },
    schema,
  });

  return { success: true };
}

async function handleFileList(
  supabaseClient: any,
  params: {
    userId: string;
    folderId?: string;
    tenantId: string;
    schema: string;
  }
) {
  const { userId, folderId, tenantId, schema } = params;

  // Check folder permissions
  if (folderId) {
    const hasPermission = await checkFolderPermission(
      supabaseClient,
      userId,
      folderId,
      "view"
    );
    if (!hasPermission) {
      throw new Error("Insufficient permissions to access this folder");
    }
  }

  // Get files in folder
  const { data: files, error: filesError } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .select("*")
    .eq("folder_id", folderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filesError) throw filesError;

  // Get subfolders
  const { data: folders, error: foldersError } = await supabaseClient
    .schema(schema)
    .from("storage_folders")
    .select("*")
    .eq("parent_folder_id", folderId)
    .is("deleted_at", null)
    .order("name");

  if (foldersError) throw foldersError;

  return {
    files: files || [],
    folders: folders || [],
  };
}

async function handleCreateFolder(
  supabaseClient: any,
  params: {
    userId: string;
    folderId?: string;
    folderName: string;
    tenantId: string;
    schema: string;
  }
) {
  const { userId, folderId, folderName, tenantId, schema } = params;

  // Check parent folder permissions
  // if (folderId) {
  //   const hasPermission = await checkFolderPermission(
  //     supabaseClient,
  //     userId,
  //     folderId,
  //     "edit"
  //   );
  //   if (!hasPermission) {
  //     throw new Error(
  //       "Insufficient permissions to create folder in this location"
  //     );
  //   }
  // }

  // Get parent folder path
  const parentPath = folderId
    ? await getFolderPath(supabaseClient, folderId, schema)
    : "";
  const newPath = parentPath ? `${parentPath}/${folderName}` : `/${folderName}`;

  // Create folder record
  const { data: folderRecord, error } = await supabaseClient
    .schema(schema)
    .from("storage_folders")
    .insert({
      name: folderName,
      parent_folder_id: folderId,
      path: newPath,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "create_folder",
    resourceType: "folder",
    resourceId: folderRecord.id,
    details: { folderName, path: newPath },
    schema,
  });

  return folderRecord;
}

async function handleDeleteFolder(
  supabaseClient: any,
  gcsService: GoogleCloudStorageService,
  params: {
    userId: string;
    folderId: string;
    tenantId: string;
    schema: string;
  }
) {
  const { userId, folderId, tenantId, schema } = params;

  // Check permissions
  // const hasPermission = await checkFolderPermission(
  //   supabaseClient,
  //   userId,
  //   folderId,
  //   "admin"
  // );
  // if (!hasPermission) {
  //   throw new Error("Insufficient permissions to delete this folder");
  // }

  const { data: folder, error: folderError } = await supabaseClient
    .schema(schema)
    .from("storage_folders")
    .select("*")
    .eq("id", folderId)
    .is("deleted_at", null)
    .single();

  if (folderError) throw folderError;

  // Get folder and all subfolders
  const { data: folders, error: foldersError } = await supabaseClient
    .schema(schema)
    .from("storage_folders")
    .select("*")
    .or(`name.eq.${folder.name},path.like.${folder.name}%`)
    .is("deleted_at", null);

  if (foldersError) throw foldersError;

  const folderIds = folders.map((f: any) => f.id);

  // Get all files in these folders
  const { data: files, error: filesError } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .select("*")
    .in("folder_id", folderIds)
    .is("deleted_at", null);

  if (filesError) throw filesError;

  // Soft delete folders
  const { error: deleteFoldersError } = await supabaseClient
    .schema(schema)
    .from("storage_folders")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", folderIds);

  if (deleteFoldersError) throw deleteFoldersError;

  // Soft delete files
  const { error: deleteFilesError } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .update({ deleted_at: new Date().toISOString() })
    .in(
      "id",
      files.map((f: any) => f.id)
    );

  if (deleteFilesError) throw deleteFilesError;

  // Delete files from GCS
  for (const file of files) {
    await gcsService.deleteFile(file.gcs_blob_name);
  }

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "delete_folder",
    resourceType: "folder",
    resourceId: folderId,
    details: { folderCount: folders.length, fileCount: files.length },
    schema,
  });

  return {
    success: true,
    deletedFolders: folders.length,
    deletedFiles: files.length,
  };
}

async function handleShareResource(
  supabaseClient: any,
  params: {
    userId: string;
    resourceId: string;
    resourceType: "file" | "folder";
    shareWith: string;
    permission: "view" | "edit" | "admin";
    tenantId: string;
  }
) {
  const { userId, resourceId, resourceType, shareWith, permission, tenantId } =
    params;

  // Check if user has permission to share this resource
  const hasPermission = await checkResourcePermission(
    supabaseClient,
    userId,
    resourceId,
    resourceType,
    "admin"
  );
  if (!hasPermission) {
    throw new Error("Insufficient permissions to share this resource");
  }

  // Get user to share with
  const { data: targetUser, error: userError } = await supabaseClient
    .from("users")
    .select("id")
    .eq("clerk_user_id", shareWith)
    .single();

  if (userError || !targetUser) {
    throw new Error("User not found");
  }

  // Create share record
  const { data: shareRecord, error } = await supabaseClient
    .schema(tenantId)
    .from("storage_shares")
    .upsert({
      resource_type: resourceType,
      resource_id: resourceId,
      shared_by: userId,
      shared_with: targetUser.id,
      permission: permission,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "share",
    resourceType: resourceType,
    resourceId: resourceId,
    details: { sharedWith: shareWith, permission },
    schema: tenantId,
  });

  return shareRecord;
}

async function handleUnshareResource(
  supabaseClient: any,
  params: {
    userId: string;
    resourceId: string;
    resourceType: "file" | "folder";
    shareWith: string;
    tenantId: string;
  }
) {
  const { userId, resourceId, resourceType, shareWith, tenantId } = params;

  // Check if user has permission to unshare this resource
  const hasPermission = await checkResourcePermission(
    supabaseClient,
    userId,
    resourceId,
    resourceType,
    "admin"
  );
  if (!hasPermission) {
    throw new Error("Insufficient permissions to unshare this resource");
  }

  // Get user to unshare from
  const { data: targetUser, error: userError } = await supabaseClient
    .from("users")
    .select("id")
    .eq("clerk_user_id", shareWith)
    .single();

  if (userError || !targetUser) {
    throw new Error("User not found");
  }

  // Delete share record
  const { error } = await supabaseClient
    .schema(tenantId)
    .from("storage_shares")
    .delete()
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .eq("shared_with", targetUser.id);

  if (error) throw error;

  // Log activity
  await logStorageActivity(supabaseClient, {
    userId,
    action: "unshare",
    resourceType: resourceType,
    resourceId: resourceId,
    details: { unsharedWith: shareWith },
    schema: tenantId,
  });

  return { success: true };
}

async function handleGetMetadata(
  supabaseClient: any,
  params: {
    userId: string;
    fileId: string;
    tenantId: string;
  }
) {
  const { userId, fileId, tenantId } = params;

  // Get file record
  const { data: fileRecord, error } = await supabaseClient
    .schema(tenantId)
    .from("storage_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (error || !fileRecord) {
    throw new Error("File not found");
  }

  // Check permissions
  const hasPermission = await checkFilePermission(
    supabaseClient,
    userId,
    fileId,
    "view"
  );
  if (!hasPermission) {
    throw new Error("Insufficient permissions to access this file");
  }

  return fileRecord;
}

// Helper functions

async function checkFilePermission(
  supabaseClient: any,
  userId: string,
  fileId: string,
  permission: string
): Promise<boolean> {
  const { data, error } = await supabaseClient.rpc("check_storage_permission", {
    user_uuid: userId,
    resource_type: "file",
    resource_uuid: fileId,
    required_permission: permission,
  });

  if (error) throw error;
  return data;
}

async function checkFolderPermission(
  supabaseClient: any,
  userId: string,
  folderId: string,
  permission: string
): Promise<boolean> {
  console.log("checkFolderPermission", userId, folderId, permission);
  const { data, error } = await supabaseClient.rpc("check_storage_permission", {
    user_uuid: userId,
    resource_type: "folder",
    resource_uuid: folderId,
    required_permission: permission,
  });

  if (error) throw error;
  return data;
}

async function checkResourcePermission(
  supabaseClient: any,
  userId: string,
  resourceId: string,
  resourceType: string,
  permission: string
): Promise<boolean> {
  const { data, error } = await supabaseClient.rpc("check_storage_permission", {
    user_uuid: userId,
    resource_type: resourceType,
    resource_uuid: resourceId,
    required_permission: permission,
  });

  if (error) throw error;
  return data;
}

async function getFolderPath(
  supabaseClient: any,
  folderId: string,
  schema: string
): Promise<string> {
  const { data, error } = await supabaseClient
    .schema(schema)
    .rpc("get_folder_path", {
      folder_uuid: folderId,
    });

  if (error) throw error;
  return data || "";
}

async function calculateChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logStorageActivity(
  supabaseClient: any,
  params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: any;
    schema: string;
  }
) {
  const { userId, action, resourceType, resourceId, details, schema } = params;

  await supabaseClient
    .schema(schema)
    .from("storage_activity_log")
    .insert({
      user_id: userId,
      action: action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
    });
}

// Direct file upload handler (no base64 conversion)
async function handleDirectFileUpload(
  supabaseClient: any,
  gcsService: GoogleCloudStorageService,
  params: {
    userId: string;
    folderId?: string;
    fileName: string;
    fileData: Uint8Array; // Direct buffer
    mimeType: string;
    tenantId: string;
    uploadedBy: string;
    schema: string;
  }
) {
  const {
    userId,
    folderId,
    fileName,
    fileData,
    mimeType,
    tenantId,
    uploadedBy,
    schema,
  } = params;

  // Check if user has permission to upload to this folder
  // if (folderId) {
  //   const hasPermission = await checkFolderPermission(
  //     supabaseClient,
  //     userId,
  //     folderId,
  //     "edit"
  //   );
  //   if (!hasPermission) {
  //     throw new Error("Insufficient permissions to upload to this folder");
  //   }
  // }

  // Calculate checksum
  const checksum = await calculateChecksum(fileData);

  // Get folder path
  const folderPath = folderId
    ? await getFolderPath(supabaseClient, folderId, schema)
    : "root";

  // Upload to GCS
  const uploadResult = await gcsService.uploadFile(
    tenantId,
    userId,
    folderPath,
    fileName,
    fileData,
    mimeType,
    { checksum, uploadedBy }
  );

  // Save file metadata to database
  const { data: fileRecord, error } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .insert({
      name: fileName,
      original_name: fileName,
      folder_id: folderId,
      gcs_blob_name: uploadResult.blobName,
      gcs_blob_url: uploadResult.blobUrl,
      mime_type: mimeType,
      size_bytes: fileData.length,
      checksum: checksum,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving file metadata:", error);
    throw error;
  }

  // Log activity
  try {
    await logStorageActivity(supabaseClient, {
      userId,
      action: "upload",
      resourceType: "file",
      resourceId: fileRecord.id,
      details: { fileName, size: fileData.length, mimeType },
      schema,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }

  return fileRecord;
}

async function handleGetFolders(
  supabaseClient: any,
  userId: string,
  schema: string,
  orgId: string
) {
  const { data: folders, error: foldersError } = await supabaseClient
    .schema(schema)
    .from("storage_folders")
    .select("*")
    .eq("created_by", userId)
    .is("deleted_at", null);

  const member = await supabaseClient
    .schema("private")
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();

  const { data: files, error: filesError } = await supabaseClient
    .schema(schema)
    .from("storage_files")
    .select("*")
    .eq("uploaded_by", member.data?.id)
    .is("deleted_at", null);

  // Build tree structure from flat folder and files data
  const buildFolderTree = (
    folders: any[],
    parentId: string | null = null
  ): any[] => {
    const folderMap = new Map<string, any>();
    const rootFolders: any[] = [];

    // First pass: create a map of all folders by ID
    folders.forEach((folder: any) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [] as any[],
        documents: [] as any[],
      });
    });

    // Second pass: build the tree structure
    folders.forEach((folder: any) => {
      const folderNode = folderMap.get(folder.id);

      // Add files to this folder
      const folderFiles =
        files?.filter((file: any) => file.folder_id === folder.id) || [];

      folderNode.documents = folderFiles.sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );

      if (folder.parent_folder_id === parentId) {
        // This is a root level folder for the current query
        rootFolders.push(folderNode);
      } else if (folderMap.has(folder.parent_folder_id)) {
        // This folder has a parent, add it to parent's children
        const parentFolder = folderMap.get(folder.parent_folder_id);
        parentFolder.children.push(folderNode);
      }
    });
    // Sort children and documents at each level
    const sortTree = (nodes: any[]): any[] => {
      return nodes
        .map((node: any) => ({
          ...node,
          children: sortTree(
            node.children.sort((a: any, b: any) => a.name.localeCompare(b.name))
          ),
          documents: node.documents.sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          ),
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    return sortTree(rootFolders);
  };

  const treeData = buildFolderTree(folders || []);

  if (foldersError) throw foldersError;
  if (filesError) throw filesError;

  return treeData;
}

async function handleCreateFolderCase(
  supabaseClient: any,
  params: {
    folderCaseName: string;
    userId: string;
    schema: string;
  }
) {
  const { folderCaseName, schema, userId } = params;
  console.log("handleCreateFolderCase", folderCaseName, schema, userId);

  const { data: folderCase, error: folderCaseError } = await supabaseClient
    .schema(schema)
    .from("cases")
    .insert({
      title: folderCaseName,
      case_number: `CASE-${Date.now()}`,
      status: "active",
      client_name_encrypted: folderCaseName,
      lead_attorney_id: userId,
      team_member_ids: [userId],
      client_portal_enabled: false,
      retention_policy: "standard",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  const defaultFolders = [
    {
      name: "Contracts",
      path: "/contracts",
    },
    {
      name: "Financial",
      path: "/financial",
    },
    {
      name: "Documents",
      path: "/documents",
    },
    {
      name: "Evidence Documentation",
      path: "/evidence-documentation",
    },
    {
      name: "Correspondence",
      path: "/correspondence",
    },
    {
      name: "Legal Documents",
      path: "/legal-documents",
    },
  ];

  for (const folder of defaultFolders) {
    console.log("Creating default folder:", folder);
    try {
      await supabaseClient.schema(schema).from("storage_folders").insert({
        name: folder.name,
        path: folder.path,
        created_by: userId,
        case_id: folderCase.id,
      });
    } catch (error) {
      console.error("Error creating default folder:", error);
    }
  }

  if (folderCaseError) throw folderCaseError;
  return folderCase;
}

async function handleGetFolderCases(
  supabaseClient: any,
  params: {
    userId: string;
    schema: string;
  }
) {
  const { userId, schema } = params;

  const { data: folderCases, error: folderCasesError } = await supabaseClient
    .schema(schema)
    .from("cases")
    .select("*");

  if (folderCasesError) throw folderCasesError;

  return folderCases;
}

export default app;
