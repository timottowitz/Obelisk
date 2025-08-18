// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";
import {
  seedCaseTypes,
  DEFAULT_CASE_TYPES,
} from "../_shared/default-case-types.ts";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";

console.log("Hello from Cases Functions!");

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
app.use("/cases/*", extractUserAndOrgId);

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

// SEEDER ENDPOINTS

// GET /cases/seed/preview - Preview default case types that would be seeded
app.get("/cases/seed/preview", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    await getSupabaseAndOrgInfo(orgId, userId); // Just for auth validation

    // Return the default configuration without creating anything
    return c.json(
      {
        message: "Preview of default case types and templates",
        case_types: DEFAULT_CASE_TYPES.map((ct) => ({
          name: ct.name,
          display_name: ct.display_name,
          description: ct.description,
          color: ct.color,
          icon: ct.icon,
          template_count: ct.folder_templates.length,
        })),
        total_case_types: DEFAULT_CASE_TYPES.length,
        total_templates: DEFAULT_CASE_TYPES.reduce(
          (sum, ct) => sum + ct.folder_templates.length,
          0
        ),
      },
      200
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /cases/seed/run - Run the seeder to create default case types and templates
app.post("/cases/seed/run", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, member } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    // Check if user has admin privileges (optional - you might want to restrict this)
    if (member.role !== "admin" && member.role !== "owner") {
      return c.json({ error: "Only administrators can run seeders" }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { force = false, case_types = null } = body;

    // Check if there are already case types
    const { data: existingCaseTypes, error: countError } = await supabase
      .schema(schema)
      .from("case_types")
      .select("id", { count: "exact" });

    if (countError) {
      return c.json(
        { error: "Failed to check existing case types", details: countError },
        500
      );
    }

    if (existingCaseTypes && existingCaseTypes.length > 0 && !force) {
      return c.json(
        {
          error: "Case types already exist. Use 'force: true' to seed anyway",
          existing_count: existingCaseTypes.length,
        },
        400
      );
    }

    // Run the seeder
    try {
      await seedCaseTypes(supabase, schema);

      // Get the newly created case types count
      const { data: newCaseTypes, error: newCountError } = await supabase
        .schema(schema)
        .from("case_types")
        .select("id, name, display_name", { count: "exact" });

      if (newCountError) {
        console.error("Error getting seeded case types count:", newCountError);
      }

      return c.json(
        {
          success: true,
          message: "Default case types and templates seeded successfully",
          seeded_case_types: newCaseTypes?.length || 0,
          case_types: newCaseTypes || [],
        },
        200
      );
    } catch (seedError: any) {
      console.error("Seeding error:", seedError);
      return c.json(
        {
          error: "Failed to seed case types",
          details: seedError.message,
        },
        500
      );
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /cases/seed/custom - Seed custom case types and templates
app.post("/cases/seed/custom", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, member } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    // Check if user has admin privileges
    if (member.role !== "admin" && member.role !== "owner") {
      return c.json(
        { error: "Only administrators can create custom case types" },
        403
      );
    }

    const body = await c.req.json();
    const { case_types } = body;

    if (!case_types || !Array.isArray(case_types)) {
      return c.json({ error: "case_types array is required" }, 400);
    }

    const results = [];

    for (const caseTypeConfig of case_types) {
      try {
        // Validate required fields
        if (!caseTypeConfig.name || !caseTypeConfig.display_name) {
          results.push({
            name: caseTypeConfig.name || "unknown",
            success: false,
            error: "Missing required fields: name and display_name",
          });
          continue;
        }

        // Check if case type already exists
        const { data: existingCaseType } = await supabase
          .schema(schema)
          .from("case_types")
          .select("id")
          .eq("name", caseTypeConfig.name)
          .single();

        if (existingCaseType) {
          results.push({
            name: caseTypeConfig.name,
            success: false,
            error: "Case type already exists",
          });
          continue;
        }

        // Create case type
        const { data: newCaseType, error: caseTypeError } = await supabase
          .schema(schema)
          .from("case_types")
          .insert({
            name: caseTypeConfig.name,
            display_name: caseTypeConfig.display_name,
            description: caseTypeConfig.description || null,
            color: caseTypeConfig.color || "#3B82F6",
            icon: caseTypeConfig.icon || "folder",
          })
          .select("id")
          .single();

        if (caseTypeError) {
          results.push({
            name: caseTypeConfig.name,
            success: false,
            error: caseTypeError.message,
          });
          continue;
        }

        // Create folder templates if provided
        let templatesCreated = 0;
        if (
          caseTypeConfig.folder_templates &&
          Array.isArray(caseTypeConfig.folder_templates)
        ) {
          for (const template of caseTypeConfig.folder_templates) {
            try {
              await supabase
                .schema(schema)
                .from("folder_templates")
                .insert({
                  case_type_id: newCaseType.id,
                  name: template.name,
                  path: template.path,
                  parent_path: template.parent_path || null,
                  sort_order: template.sort_order || 0,
                  is_required: template.is_required !== false,
                });
              templatesCreated++;
            } catch (templateError) {
              console.error(
                `Failed to create template ${template.name}:`,
                templateError
              );
            }
          }
        }

        results.push({
          name: caseTypeConfig.name,
          success: true,
          case_type_id: newCaseType.id,
          templates_created: templatesCreated,
        });
      } catch (error: any) {
        results.push({
          name: caseTypeConfig.name || "unknown",
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return c.json(
      {
        success: successCount > 0,
        message: `Seeded ${successCount} case types, ${failureCount} failed`,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
      },
      200
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// CASE TYPES ENDPOINTS

// GET /cases/types - List all case types
app.get("/cases/types", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: caseTypes, error } = await supabase
      .schema(schema)
      .from("case_types")
      .select("*, folder_templates(*)")
      .eq("is_active", true);

    if (error) {
      return c.json(
        { error: "Failed to fetch case types", details: error },
        500
      );
    }

    return c.json({ caseTypes: caseTypes || [] }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /cases/types/:id - Get specific case type with templates
app.get("/cases/types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseTypeId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: caseType, error } = await supabase
      .schema(schema)
      .from("case_types")
      .select(
        `
        *,
        folder_templates(
          id,
          name,
          path,
          parent_path,
          sort_order,
          is_required
        )
      `
      )
      .eq("id", caseTypeId)
      .eq("is_active", true)
      .single();

    if (error || !caseType) {
      return c.json({ error: "Case type not found" }, 404);
    }

    return c.json(caseType, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /cases/types - Create new case type
app.post("/cases/types", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const body = await c.req.json();
    const { name, display_name, description, color, icon, folder_templates } =
      body;

    if (!name || !display_name) {
      return c.json(
        { error: "Missing required fields: name, display_name" },
        400
      );
    }

    // Validate name format (no spaces, lowercase, underscores allowed)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return c.json(
        {
          error:
            "Name must contain only lowercase letters, numbers, and underscores",
        },
        400
      );
    }

    // Check if case type name already exists
    const { data: existingType } = await supabase
      .schema(schema)
      .from("case_types")
      .select("id")
      .eq("name", name)
      .single();

    if (existingType) {
      return c.json(
        { error: "A case type with this name already exists" },
        400
      );
    }

    // Create case type
    const { data: newCaseType, error: insertError } = await supabase
      .schema(schema)
      .from("case_types")
      .insert({
        name,
        display_name,
        description: description || null,
        color: color || "#3B82F6",
        icon: icon || "folder",
      })
      .select()
      .single();

    if (insertError || !newCaseType) {
      return c.json(
        { error: "Failed to create case type", details: insertError },
        500
      );
    }

    // Create folder templates if provided
    if (folder_templates && Array.isArray(folder_templates)) {
      const templateInserts = folder_templates.map((template: any) => ({
        case_type_id: newCaseType.id,
        name: template.name,
        path: template.path,
        parent_path: template.parent_path || null,
        sort_order: template.sort_order || 0,
        is_required: template.is_required !== false,
      }));

      if (templateInserts.length > 0) {
        const { error: templatesError } = await supabase
          .schema(schema)
          .from("folder_templates")
          .insert(templateInserts);

        if (templatesError) {
          console.error("Failed to create folder templates:", templatesError);
        }
      }
    }

    return c.json({ caseType: newCaseType }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /cases/types/:id - Update case type
app.put("/cases/types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseTypeId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const body = await c.req.json();
    const { name, display_name, description, color, icon, is_active } = body;

    // If name is being updated, validate it
    if (name) {
      const nameRegex = /^[a-z0-9_]+$/;
      if (!nameRegex.test(name)) {
        return c.json(
          {
            error:
              "Name must contain only lowercase letters, numbers, and underscores",
          },
          400
        );
      }

      // Check if name is unique (excluding current record)
      const { data: existingType } = await supabase
        .schema(schema)
        .from("case_types")
        .select("id")
        .eq("name", name)
        .neq("id", caseTypeId)
        .single();

      if (existingType) {
        return c.json(
          { error: "A case type with this name already exists" },
          400
        );
      }
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedCaseType, error: updateError } = await supabase
      .schema(schema)
      .from("case_types")
      .update(updateData)
      .eq("id", caseTypeId)
      .select()
      .single();

    if (updateError || !updatedCaseType) {
      return c.json(
        { error: "Case type not found or update failed", details: updateError },
        404
      );
    }

    return c.json({ caseType: updatedCaseType }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /cases/types/:id - Delete case type (soft delete)
app.delete("/cases/types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseTypeId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    // Soft delete case type
    const { error } = await supabase
      .schema(schema)
      .from("case_types")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseTypeId);

    if (error) {
      return c.json(
        { error: "Failed to delete case type", details: error },
        500
      );
    }

    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// FOLDER TEMPLATES ENDPOINTS

// GET /cases/types/:id/templates - Get folder templates for a case type
app.get("/cases/types/:id/templates", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseTypeId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: templates, error } = await supabase
      .schema(schema)
      .from("folder_templates")
      .select("*")
      .eq("case_type_id", caseTypeId)
      .order("sort_order");

    if (error) {
      return c.json(
        { error: "Failed to fetch folder templates", details: error },
        500
      );
    }

    return c.json({ templates: templates || [] }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /cases/types/:id/templates - Add folder template to case type
app.post("/cases/types/:id/templates", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseTypeId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const body = await c.req.json();
    const { name, path, parent_path, sort_order, is_required } = body;

    if (!name || !path) {
      return c.json({ error: "Missing required fields: name, path" }, 400);
    }

    // Verify case type exists
    const { data: caseType, error: caseTypeError } = await supabase
      .schema(schema)
      .from("case_types")
      .select("id")
      .eq("id", caseTypeId)
      .eq("is_active", true)
      .single();

    if (caseTypeError || !caseType) {
      return c.json({ error: "Case type not found" }, 404);
    }

    const { data: newTemplate, error: insertError } = await supabase
      .schema(schema)
      .from("folder_templates")
      .insert({
        case_type_id: caseTypeId,
        name,
        path,
        parent_path: parent_path || null,
        sort_order: sort_order || 0,
        is_required: is_required !== false,
      })
      .select()
      .single();

    if (insertError || !newTemplate) {
      return c.json(
        { error: "Failed to create folder template", details: insertError },
        500
      );
    }

    return c.json({ template: newTemplate }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /cases/templates/:templateId - Update folder template
app.put("/cases/templates/:templateId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const templateId = c.req.param("templateId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const body = await c.req.json();
    const { name, path, parent_path, sort_order, is_required } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (path !== undefined) updateData.path = path;
    if (parent_path !== undefined) updateData.parent_path = parent_path;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_required !== undefined) updateData.is_required = is_required;

    const { data: updatedTemplate, error: updateError } = await supabase
      .schema(schema)
      .from("folder_templates")
      .update(updateData)
      .eq("id", templateId)
      .select()
      .single();

    if (updateError || !updatedTemplate) {
      return c.json(
        { error: "Template not found or update failed", details: updateError },
        404
      );
    }

    return c.json({ template: updatedTemplate }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /cases/templates/:templateId - Delete folder template
app.delete("/cases/templates/:templateId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const templateId = c.req.param("templateId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { error: deleteError } = await supabase
      .schema(schema)
      .from("folder_templates")
      .delete()
      .eq("id", templateId);

    if (deleteError) {
      return c.json(
        { error: "Failed to delete template", details: deleteError },
        500
      );
    }

    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// CASES ENDPOINTS (Enhanced with case types)

// GET /cases - List all cases with case type information
app.get("/cases", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    // Parse query params
    const url = new URL(c.req.url);
    const type = url.searchParams.get("type") || "all";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "5");
    const offset = (page - 1) * limit;
    const orderBy = url.searchParams.get("orderBy") || "claimant";
    const orderDirection = (url.searchParams.get("sort") || "asc") as
      | "asc"
      | "desc";
    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;

    // Check if we're getting a specific case by ID
    const pathParts = url.pathname.split("/");
    const caseId = pathParts[pathParts.length - 1];

    if (caseId && caseId !== "cases") {
      const { data: case_, error } = await supabase
        .schema(schema)
        .from("cases")
        .select(
          `
          *,
          case_types(
            id,
            name,
            display_name,
            description,
            color,
            icon
          )
        `
        )
        .eq("id", caseId)
        .single();

      if (error || !case_) {
        return c.json({ error: "Case not found" }, 404);
      }

      return c.json({ case: case_ }, 200);
    }

    try {
      const display_name =
        type === "imva"
          ? "IMVA"
          : type === "litigation"
          ? "Litigation"
          : "Solar";

      // Build query for listing cases with contacts joined
      let query = supabase
        .schema(schema)
        .from("cases")
        .select(
          `
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        ),
        claimant:contacts!claimant_id(
          id,
          full_name,
          sort_by_first
        ),
        respondent:contacts!respondent_id(
          id,
          full_name,
          sort_by_first
        )
      `,
          { count: "exact" }
        );

      // Apply filters

      if (type !== "all") {
        const { data: caseType, error: caseTypeError } = await supabase
          .schema(schema)
          .from("case_types")
          .select("*")
          .eq("display_name", display_name)
          .single();

        if (caseTypeError || !caseType) {
          return c.json({ error: "Case type not found" }, 404);
        }
        query = query.eq("case_type_id", caseType.id);
      }

      if (search) {
        // Search by case number or by joining with contacts for names
        const searchLower = search.toLowerCase();

        // First, get contact IDs that match the search term
        const { data: matchingContacts } = await supabase
          .schema(schema)
          .from("contacts")
          .select("id")
          .ilike("full_name", `%${searchLower}%`);

        const contactIds = matchingContacts?.map((c) => c.id) || [];

        if (contactIds.length > 0) {
          // Search by case number OR claimant_id OR respondent_id
          query = query.or(
            `case_number.ilike.%${search}%,claimant_id.in.(${contactIds.join(
              ","
            )}),respondent_id.in.(${contactIds.join(
              ","
            )}),case_manager.ilike.%${search}%`
          );
        } else {
          // Just search by case number if no matching contacts found
          query = query.or(
            `case_number.ilike.%${search}%,case_manager.ilike.%${search}%`
          );
        }
      }

      if (status) {
        query = query.eq("status", status);
      }
      // For special sorting fields, we need to fetch all data first
      const needsPostProcessing = [
        "claimant",
        "case_number",
        "status",
        "respondent",
        "case_manager",
        "docs",
        "tasks",
        "next_event",
      ].includes(orderBy);

      // If we need post-processing, don't apply pagination yet
      if (!needsPostProcessing) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data: cases, error, count } = await query;

      if (error) {
        return c.json({ error: "Failed to fetch cases", details: error }, 500);
      }

      const detailedCases = [];

      for (const caseItem of cases) {
        const { data: caseTasks, error: caseTasksError } = await supabase
          .schema(schema)
          .from("case_tasks")
          .select("*")
          .eq("case_id", caseItem.id);

        if (caseTasksError) {
          console.error("Failed to fetch case tasks:", caseTasksError);
          return c.json(
            { error: "Failed to fetch case tasks", details: caseTasksError },
            500
          );
        }

        const { data: folders, error: foldersError } = await supabase
          .schema(schema)
          .from("storage_folders")
          .select("*")
          .eq("case_id", caseItem.id);

        if (foldersError) {
          console.error("Failed to fetch folders:", foldersError);
          return c.json(
            { error: "Failed to fetch folders", details: foldersError },
            500
          );
        }

        let documentsCount = 0;
        for (const folder of folders) {
          const { data: documents, error: documentsError } = await supabase
            .schema(schema)
            .from("storage_files")
            .select("*")
            .eq("folder_id", folder.id)
            .is("deleted_at", null);

          if (documentsError) {
            console.error("Failed to fetch documents:", documentsError);
            return c.json(
              { error: "Failed to fetch documents", details: documentsError },
              500
            );
          }

          documentsCount += documents?.length || 0;
        }

        detailedCases.push({
          ...caseItem,
          case_tasks_count: caseTasks?.length || 0,
          documents_count: documentsCount,
        });
      }

      // Apply sorting for special fields after fetching all data
      if (needsPostProcessing) {
        try {
          detailedCases.sort((a, b) => {
            let compareValue = 0;

            switch (orderBy) {
              case "docs":
                compareValue = a.documents_count - b.documents_count;
                break;
              case "tasks":
                compareValue = a.case_tasks_count - b.case_tasks_count;
                break;
              case "status":
                compareValue = a.status.localeCompare(b.status);
                break;
              case "case_number":
                compareValue = a.case_number.localeCompare(b.case_number);
                break;
              case "claimant":
                compareValue = a.claimant.sort_by_first.localeCompare(
                  b.claimant.sort_by_first
                );
                break;
              case "respondent":
                compareValue = a.respondent.sort_by_first.localeCompare(
                  b.respondent.sort_by_first
                );
                break;
              case "case_manager":
                compareValue = a.case_manager.localeCompare(b.case_manager);
                break;
              case "next_event": {
                const aNextEvent = a.next_event === null ? "" : a.next_event;
                const bNextEvent = b.next_event === null ? "" : b.next_event;
                compareValue = aNextEvent.localeCompare(bNextEvent);
                break;
              }
              default:
                compareValue = 0;
            }

            return orderDirection === "asc" ? compareValue : -compareValue;
          });
        } catch (error) {
          console.error("Failed to sort cases:", error);
          return c.json({ error: "Failed to sort cases", details: error }, 500);
        }

        // Apply pagination after sorting
        const paginatedCases = detailedCases.slice(offset, offset + limit);

        return c.json(
          {
            cases: paginatedCases || [],
            total: detailedCases.length || 0,
            limit,
            offset,
          },
          200
        );
      }

      return c.json(
        {
          cases: detailedCases || [],
          total: count || 0,
          limit,
          offset,
        },
        200
      );
    } catch (error: any) {
      return c.json({ error: "Failed to fetch cases", details: error }, 500);
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /cases/:id - Get specific case with case type information
app.get("/cases/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: caseData, error } = await supabase
      .schema(schema)
      .from("cases")
      .select(
        `
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        ),
        claimant:contacts!claimant_id(
          id,
          full_name,
          emails,
          phones,
          addresses
        ),
        respondent:contacts!respondent_id(
          id,
          full_name,
          emails,
          phones,
          addresses
        )
      `
      )
      .eq("id", caseId)
      .single();

    if (error || !caseData) {
      return c.json({ error: "Case not found", details: error }, 404);
    }

    return c.json(caseData, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Helper function to create folders from templates
async function createFoldersFromTemplates(
  supabase: any,
  schema: string,
  caseTypeId: string,
  caseId: string,
  userId: string
) {
  // Get folder templates for the case type
  const { data: templates, error: templatesError } = await supabase
    .schema(schema)
    .from("folder_templates")
    .select("*")
    .eq("case_type_id", caseTypeId)
    .order("sort_order");

  if (templatesError || !templates) {
    console.error("Failed to fetch folder templates:", templatesError);
    return;
  }
  // Create folders from templates
  for (const template of templates) {
    try {
      const { data: folder, error: folderError } = await supabase
        .schema(schema)
        .from("storage_folders")
        .insert({
          name: template.name,
          path: template.path,
          case_id: caseId,
          case_type_id: caseTypeId,
          created_by: userId,
          parent_folder_id: null, // We'll handle nesting in a future enhancement
        })
        .select()
        .single();
      if (folderError) {
        console.error("Failed to create folder:", folderError);
        throw new Error("Failed to create folder", folderError);
      }
      console.log("Folder created:", folder);
    } catch (error) {
      console.error(`Failed to create folder ${template.name}:`, error);
    }
  }
}

// POST /cases - Create new case with automatic folder structure
app.post("/cases", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, user, member } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    const formData = await c.req.formData();
    const body = Object.fromEntries(formData.entries());
    const documents = formData.getAll("documents");

    const {
      full_name,
      phone,
      email,
      case_type_id,
      special_notes,
      filing_fee,
      case_number,
      adr_process,
      applicable_rules,
      track,
      claim_amount,
      hearing_locale,
      case_manager,
      initial_task,
      next_event,
      special_instructions,
      claimant_id,
      respondent_id,
    } = body;

    if (!full_name) {
      return c.json({ error: "Missing required field: full_name" }, 400);
    }

    if (!case_type_id) {
      return c.json({ error: "Missing required field: case_type_id" }, 400);
    }

    // Verify case type exists
    const { data: caseType, error: caseTypeError } = await supabase
      .schema(schema)
      .from("case_types")
      .select("*")
      .eq("id", case_type_id)
      .eq("is_active", true)
      .single();

    if (caseTypeError || !caseType) {
      return c.json({ error: "Case type not found" }, 400);
    }

    // Check if case name already exists
    const { data: existingCase } = await supabase
      .schema(schema)
      .from("cases")
      .select("id")
      .eq("full_name", full_name)
      .single();

    if (existingCase) {
      return c.json({ error: "A case with this name already exists" }, 400);
    }

    // Create new case
    const { data: newCase, error: insertError } = await supabase
      .schema(schema)
      .from("cases")
      .insert({
        full_name,
        phone,
        email,
        status: "inactive",
        case_type_id,
        special_notes,
        filing_fee: filing_fee ? parseFloat(filing_fee as string) : null,
        case_number,
        adr_process,
        applicable_rules,
        track,
        claim_amount: claim_amount ? parseFloat(claim_amount as string) : null,
        hearing_locale,
        claimant_id,
        respondent_id,
        case_manager,
        initial_task,
        next_event: next_event === "" ? null : next_event,
        special_instructions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newCase) {
      return c.json(
        { error: "Failed to create case", details: insertError },
        500
      );
    }

    // Create folder structure from template
    await createFoldersFromTemplates(
      supabase,
      schema,
      case_type_id as string,
      newCase.id,
      user.id
    );

    try {
      await uploadInitialDocuments(
        supabase,
        schema,
        newCase.id,
        case_type_id as string,
        userId,
        documents,
        orgId,
        member
      );
    } catch (error: any) {
      console.error("Failed to upload initial documents:", error);
    }

    // Fetch the created case with case type information
    const { data: caseWithType } = await supabase
      .schema(schema)
      .from("cases")
      .select(
        `
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        )
      `
      )
      .eq("id", newCase.id)
      .single();

    return c.json({ case: caseWithType || newCase }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /cases/:id - Update case
app.put("/cases/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const user = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    const { data: member, error: memberError } = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data.id)
      .eq("organization_id", org.data.id)
      .single();

    if (memberError) {
      return c.json(
        { error: "Failed to fetch member", details: memberError },
        500
      );
    }

    const body = await c.req.json();
    const {
      full_name,
      phone,
      email,
      case_type_id,
      special_notes,
      filing_fee,
      adr_process,
      applicable_rules,
      track,
      claim_amount,
      hearing_locale,
      claimant_id,
      respondent_id,
      case_manager,
      access,
    } = body;

    if (!full_name && !case_type_id) {
      return c.json(
        {
          error:
            "At least one field (full_name, or case_type_id) must be provided",
        },
        400
      );
    }

    // Check if case exists
    const { data: existingCase } = await supabase
      .schema(schema)
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (!existingCase) {
      return c.json({ error: "Case not found" }, 404);
    }

    if (existingCase.access === "admin_only" && member.role === "client") {
      return c.json({ error: "You are not authorized to edit this case" }, 403);
    }

    // If name is being updated, check for uniqueness
    if (full_name && full_name !== existingCase.full_name) {
      const { data: duplicateName } = await supabase
        .schema(schema)
        .from("cases")
        .select("id")
        .eq("full_name", full_name)
        .neq("id", caseId)
        .single();

      if (duplicateName) {
        return c.json({ error: "A case with this name already exists" }, 400);
      }
    }

    // If case type is being updated, verify it exists
    if (case_type_id && case_type_id !== existingCase.case_type_id) {
      const { data: caseType } = await supabase
        .schema(schema)
        .from("case_types")
        .select("id")
        .eq("id", case_type_id)
        .eq("is_active", true)
        .single();

      if (!caseType) {
        return c.json({ error: "Case type not found" }, 400);
      }
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (case_type_id !== undefined) updateData.case_type = case_type_id;
    if (special_notes !== undefined) updateData.special_notes = special_notes;
    if (filing_fee !== undefined) updateData.filing_fee = filing_fee;
    if (adr_process !== undefined) updateData.adr_process = adr_process;
    if (applicable_rules !== undefined)
      updateData.applicable_rules = applicable_rules;
    if (track !== undefined) updateData.track = track;
    if (claim_amount !== undefined) updateData.claim_amount = claim_amount;
    if (hearing_locale !== undefined)
      updateData.hearing_locale = hearing_locale;
    if (claimant_id !== undefined) updateData.claimant_id = claimant_id;
    if (respondent_id !== undefined) updateData.respondent_id = respondent_id;
    if (case_manager !== undefined) updateData.case_manager = case_manager;
    if (access !== undefined) updateData.access = access;

    const { data: updatedCase, error: updateError } = await supabase
      .schema(schema)
      .from("cases")
      .update(updateData)
      .eq("id", caseId)
      .select(
        `
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        )
      `
      )
      .single();

    if (updateError || !updatedCase) {
      return c.json(
        { error: "Failed to update case", details: updateError },
        500
      );
    }

    return c.json({ case: updatedCase }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /cases/:id - Delete case
app.delete("/cases/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    // Check if case exists
    const { data: existingCase } = await supabase
      .schema(schema)
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (!existingCase) {
      return c.json({ error: "Case not found" }, 404);
    }

    // Delete associated folders (this will cascade to files via foreign keys)
    await supabase
      .schema(schema)
      .from("storage_folders")
      .delete()
      .eq("case", caseId);

    // Delete case
    const { error: deleteError } = await supabase
      .schema(schema)
      .from("cases")
      .delete()
      .eq("id", caseId);

    if (deleteError) {
      return c.json(
        { error: "Failed to delete case", details: deleteError },
        500
      );
    }

    return c.json({ success: true, message: "Case deleted successfully" }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /cases/:id/tasks - Get tasks for case
app.get("/cases/:id/tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "5");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const {
      data: tasks,
      error: selectError,
      count,
    } = await supabase
      .schema(schema)
      .from("case_tasks")
      .select("*", { count: "exact" })
      .eq("case_id", caseId)
      .order("due_date", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (selectError || !tasks) {
      return c.json(
        { error: "Failed to fetch tasks", details: selectError },
        500
      );
    }

    return c.json({ tasks, count: count }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /cases/:id/tasks - Create task for case
app.post("/cases/:id/tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const case_id = c.req.param("id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const body = await c.req.json();

    const { name, description, due_date, assignee_id, priority, category_id } =
      body;

    const { data: newTask, error: insertError } = await supabase
      .schema(schema)
      .from("case_tasks")
      .insert({
        case_id,
        name,
        description,
        due_date,
        assignee_id,
        priority,
        category_id,
      })
      .select()
      .single();

    if (insertError) {
      return c.json(
        { error: "Failed to create task", details: insertError },
        500
      );
    }

    const { data: user } = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const { error: eventError } = await supabase
      .schema(schema)
      .from("case_events")
      .insert({
        case_id: case_id,
        event_type: "task_created",
        description: `${user.email} created task ${name}`,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toISOString().split("T")[1].split(".")[0],
      })
      .select()
      .single();

    if (eventError) {
      return c.json(
        { error: "Failed to create event", details: eventError },
        500
      );
    }

    return c.json(newTask, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /cases/:id/tasks/:taskId - Update task for case
app.put("/cases/:id/tasks/:taskId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const body = await c.req.json();

    const { name, description, due_date } = body;

    const { data: updatedTask, error: updateError } = await supabase
      .schema(schema)
      .from("case_tasks")
      .update({ name, description, due_date })
      .eq("id", taskId)
      .eq("case_id", caseId)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return c.json(
        { error: "Failed to update task", details: updateError },
        500
      );
    }

    const { data: user } = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const { error: eventError } = await supabase
      .schema(schema)
      .from("case_events")
      .insert({
        case_id: caseId,
        event_type: "task_updated",
        description: `${user.email} updated task ${name}`,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toISOString().split("T")[1].split(".")[0],
      });

    if (eventError) {
      return c.json(
        { error: "Failed to create event", details: eventError },
        500
      );
    }

    return c.json(updatedTask, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /cases/:id/tasks/:taskId - Delete task for case
app.delete("/cases/:id/tasks/:taskId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: user } = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const { data: task } = await supabase
      .schema(schema)
      .from("case_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("case_id", caseId)
      .single();

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    const { error: deleteError } = await supabase
      .schema(schema)
      .from("case_tasks")
      .delete()
      .eq("id", taskId)
      .eq("case_id", caseId);

    if (deleteError) {
      return c.json(
        { error: "Failed to delete task", details: deleteError },
        500
      );
    }

    const { error: eventError } = await supabase
      .schema(schema)
      .from("case_events")
      .insert({
        case_id: caseId,
        event_type: "task_deleted",
        description: `${user.email} deleted task ${task.name}`,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toISOString().split("T")[1].split(".")[0],
      });

    if (eventError) {
      return c.json(
        { error: "Failed to create event", details: eventError },
        500
      );
    }

    return c.json({ success: true, message: "Task deleted successfully" }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

//GET /cases/:id/events - Get events for case
app.get("/cases/:id/events", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("id");
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "5");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const {
      data: events,
      error: selectError,
      count,
    } = await supabase
      .schema(schema)
      .from("case_events")
      .select("*", { count: "exact" })
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (selectError) {
      return c.json(
        { error: "Failed to fetch events", details: selectError },
        500
      );
    }

    return c.json({ data: events, count: count }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

async function uploadInitialDocuments(
  supabase: any,
  schema: string,
  caseId: string,
  caseTypeId: string,
  userId: string,
  documents: any[],
  orgId: string,
  member: any
) {
  try {
    // Skip if no documents
    if (!documents || documents.length === 0) {
      return;
    }

    // Create or find Initial Documents folder
    let initialDocsFolder;

    // First check if Initial Documents folder already exists for this case
    const { data: existingFolder } = await supabase
      .schema(schema)
      .from("storage_folders")
      .select("*")
      .eq("case_id", caseId)
      .eq("name", "Initial Documents")
      .single();

    const { data: user } = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (!user) {
      throw new Error("User not found");
    }

    if (existingFolder) {
      initialDocsFolder = existingFolder;
    } else {
      // Create Initial Documents folder
      const { data: newFolder, error: folderError } = await supabase
        .schema(schema)
        .from("storage_folders")
        .insert({
          name: "Initial Documents",
          path: "/Initial Documents",
          parent_folder_id: null,
          created_by: user.id,
          case_type_id: caseTypeId,
          case_id: caseId,
        })
        .select()
        .single();

      if (folderError) {
        console.error(
          "Failed to create Initial Documents folder:",
          folderError
        );
        throw new Error("Failed to create Initial Documents folder");
      }

      initialDocsFolder = newFolder;
    }

    // Initialize Google Cloud Storage
    const gcsService = getGcsService();

    // Upload each document to Google Cloud Storage and save metadata
    for (const document of documents) {
      if (document instanceof File) {
        try {
          // Convert File to Uint8Array
          const buffer = await document.arrayBuffer();
          const fileData = new Uint8Array(buffer);

          const checksum = await calculateChecksum(fileData);
          const folderPath = await getFolderPath(
            supabase,
            initialDocsFolder.id,
            schema
          );

          // Upload to GCS
          const uploadResult = await gcsService.uploadFile(
            orgId,
            userId,
            folderPath,
            document.name,
            fileData,
            document.type || "application/pdf",
            {
              checksum,
              uploadedBy: user?.id,
            }
          );

          // Save file metadata to database
          const { error: fileError } = await supabase
            .schema(schema)
            .from("storage_files")
            .insert({
              name: document.name,
              original_name: document.name,
              folder_id: initialDocsFolder.id,
              gcs_blob_name: uploadResult.blobName,
              gcs_blob_url: uploadResult.blobUrl,
              mime_type: document.type || "application/pdf",
              size_bytes: fileData.length,
              checksum: checksum,
              uploaded_by: member?.id,
            })
            .select()
            .single();

          if (fileError) {
            console.error("Failed to save file metadata:", fileError);
            throw new Error("Failed to save file metadata", fileError);
          }

          // Create case event for file upload
          await supabase
            .schema(schema)
            .from("case_events")
            .insert({
              case_id: caseId,
              event_type: "file_uploaded",
              description: `${
                user?.email || "User"
              } uploaded initial document: ${document.name}`,
              date: new Date().toISOString().split("T")[0],
              time: new Date().toISOString().split("T")[1].split(".")[0],
            });
        } catch (fileUploadError: any) {
          console.error(
            `Failed to upload document ${document.name}:`,
            fileUploadError
          );
          // Continue with other documents even if one fails
        }
      }
    }
  } catch (error: any) {
    console.error("Failed to upload initial documents:", error);
    // Don't throw error to prevent case creation from failing
    // Just log the error and continue
  }
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

export default app;

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make HTTP requests:

  # Seeder Endpoints (Admin only)
  
  # Preview default case types
  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/cases/seed/preview' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]'

  # Run default seeder
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cases/seed/run' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]' \
    --header 'Content-Type: application/json' \
    --data '{"force": false}'

  # Seed custom case types
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cases/seed/custom' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]' \
    --header 'Content-Type: application/json' \
    --data '{"case_types":[{"name":"tax_law","display_name":"Tax Law","description":"Tax matters","color":"#059669","icon":"calculator","folder_templates":[{"name":"Tax Returns","path":"/tax-returns","sort_order":1}]}]}'

  # Case Types Management
  
  # List case types
  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/cases/types' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]'

  # Create case type
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cases/types' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]' \
    --header 'Content-Type: application/json' \
    --data '{"name":"custom_type","display_name":"Custom Type","description":"Custom practice area","color":"#6366F1","icon":"folder"}'

  # Cases Management
  
  # Create case with automatic folder structure
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cases' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Smith v. Jones","description":"Personal injury case","case_type_id":"[CASE_TYPE_ID]"}'

  # List cases with filtering
  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/cases?caseTypeId=[CASE_TYPE_ID]&search=smith' \
    --header 'Authorization: Bearer [TOKEN]' \
    --header 'X-Org-Id: [ORG_ID]'

*/
