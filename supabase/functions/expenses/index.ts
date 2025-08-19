// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";

console.log("Hello from Functions!");

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id"],
    credentials: true,
  })
);

app.use("/expenses/*", extractUserAndOrgId);

app.options("*", (c) => {
  return c.text("", 200);
});

//get supabase client
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

//get expense types
app.get("/expenses/types", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  try {
    const { supabase } = await getSupabaseAndOrgInfo(orgId, userId);
    const { data: expenseTypes, error: expenseTypesError } = await supabase
      .schema("public")
      .from("expense_types")
      .select("*");
    if (expenseTypesError) {
      console.error("getting expense types error", expenseTypesError);
      return c.json({ error: expenseTypesError.message }, 500);
    }
    return c.json(expenseTypes, 200);
  } catch (error: any) {
    console.error("getting expense types error", error);
    return c.json({ error: error.message }, 500);
  }
});

//create expense type
app.post("/expenses/types", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const { name } = body;

  if (!name) {
    return c.json({ error: "'name' is required" }, 400);
  }

  try {
    const { supabase } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: expenseType, error: expenseTypeError } = await supabase
      .schema("public")
      .from("expense_types")
      .insert({ name: name })
      .select()
      .single();

    if (expenseTypeError) {
      return c.json({ error: expenseTypeError.message }, 500);
    }

    return c.json({ data: expenseType }, 200);
  } catch (error: any) {
    console.error("creating expense error", error);
    return c.json({ error: error.message }, 500);
  }
});

//get initial documents for expense
app.get("/expenses/cases/:caseId/initial-documents", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const caseId = c.req.param("caseId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: folder, error: folderError } = await supabase
      .schema(schema)
      .from("storage_folders")
      .select("*")
      .eq("case_id", caseId)
      .eq("name", "Initial Documents")
      .single();

    if (folderError) {
      return c.json({ error: folderError.message }, 500);
    }
    if (folder.id) {
      const { data: initialDocuments, error: initialDocumentsError } =
        await supabase
          .schema(schema)
          .from("storage_files")
          .select("*")
          .eq("folder_id", folder.id);

      if (initialDocumentsError) {
        return c.json({ error: initialDocumentsError.message }, 500);
      }
      return c.json(initialDocuments, 200);
    }
    return c.json([], 200);
  } catch (error: any) {
    console.error("getting initial documents error", error);
    return c.json({ error: error.message }, 500);
  }
});

//create expense
app.post("/expenses/cases/:caseId", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const caseId = c.req.param("caseId");
  const body = await c.req.formData();
  const attachment = body.get("attachment") as File;
  const {
    expense_type_id,
    amount,
    payee_id,
    type,
    invoce_number,
    invoice_date,
    attachment_id,
    due_date,
    description,
    memo,
    notes,
    create_checking_quickbooks,
    create_billing_item,
    last_update_from_quickbooks,
  } = Object.fromEntries(body.entries());

  try {
    const { supabase, schema, user, member } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    const { error: caseError } = await supabase
      .schema(schema)
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError) {
      return c.json({ error: caseError.message }, 500);
    }

    const { error: payeeError } = await supabase
      .schema(schema)
      .from("contacts")
      .select("*")
      .eq("id", payee_id)
      .single();

    if (payeeError) {
      return c.json({ error: payeeError.message }, 500);
    }

    const { error: expenseTypeError } = await supabase
      .schema("public")
      .from("expense_types")
      .select("*")
      .eq("id", expense_type_id)
      .single();

    if (expenseTypeError) {
      return c.json({ error: expenseTypeError.message }, 500);
    }

    let attachmentId = '';
    if (attachment_id) {
      const { data: folder, error: folderError } = await supabase
        .schema(schema)
        .from("storage_folders")
        .select("*")
        .eq("case_id", caseId)
        .eq("name", "Expenses")
        .single();

      if (folderError) {
        return c.json({ error: folderError.message }, 500);
      }

      const { data: file, error: fileError } = await supabase
        .schema(schema)
        .from("storage_files")
        .update({
          folder_id: folder.id,
        })
        .eq("id", attachment_id)
        .select()
        .single();
        
      if (fileError) {
        return c.json({ error: fileError.message }, 500);
      }

      attachmentId = file.id;
    }

    if (attachment) {
      const gcsService = getGcsService();
      const buffer = await attachment.arrayBuffer();
      const fileData = new Uint8Array(buffer);
      const mimeType = attachment.type;
      const fileName = attachment.name;
      const { data: folder, error: folderError } = await supabase
        .schema(schema)
        .from("storage_folders")
        .select("*")
        .eq("case_id", caseId)
        .eq("name", "Expenses")
        .single();

      if (folderError) {
        return c.json({ error: folderError.message }, 500);
      }

      const fileRecord = await uploadAttachment(supabase, gcsService, {
        userId: user.id,
        fileName,
        fileData,
        mimeType,
        uploadedBy: member.id,
        schema,
        tenantId: orgId,
        folderId: folder.id,
      });
      attachmentId = fileRecord.id;
    }

    const { data: expense, error: expenseError } = await supabase
      .schema(schema)
      .from("case_expenses")
      .insert({
        case_id: caseId,
        expense_type_id: expense_type_id,
        amount: parseFloat(amount as string),
        payee_id: payee_id,
        type: type,
        invoce_number: invoce_number,
        attachment_id: attachmentId,
        invoice_date: invoice_date,
        due_date: due_date,
        description: description,
        memo: memo,
        notes: notes,
        create_checking_quickbooks: create_checking_quickbooks,
        create_billing_item: create_billing_item,
        last_update_from_quickbooks: last_update_from_quickbooks,
      })
      .select();

    if (expenseError) {
      console.error("Error creating expense:", expenseError);
      return c.json({ error: expenseError.message }, 500);
    }

    return c.json({ data: expense }, 200);
  } catch (error: any) {
    console.error("creating expense error", error);
    return c.json({ error: error.message }, 500);
  }
});

//upload attachment
async function uploadAttachment(
  supabaseClient: any,
  gcsService: GoogleCloudStorageService,
  params: {
    userId: string;
    fileName: string;
    fileData: Uint8Array;
    mimeType: string;
    uploadedBy: string;
    schema: string;
    tenantId: string;
    folderId: string;
  }
) {
  const {
    userId,
    fileName,
    fileData,
    mimeType,
    uploadedBy,
    schema,
    tenantId,
    folderId,
  } = params;

  const checksum = await calculateChecksum(fileData);

  try {
    const uploadResult = await gcsService.uploadFile(
      tenantId,
      userId,
      "expenses",
      fileName,
      fileData,
      mimeType,
      { checksum, uploadedBy }
    );

    const { data: fileRecord, error: fileRecordError } = await supabaseClient
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

    if (fileRecordError) {
      console.error("Error uploading attachment:", fileRecordError);
      throw new Error(fileRecordError.message);
    }
    await logStorageActivity(supabaseClient, {
      userId,
      action: "upload",
      resourceType: "file",
      resourceId: fileRecord.id,
      details: { fileName, size: fileData.length, mimeType },
      schema,
    });
    return fileRecord;
  } catch (error: any) {
    console.error("Error uploading attachment:", error);
    throw new Error(error.message);
  }
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

export default app;
