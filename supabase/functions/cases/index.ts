// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { seedCaseTypes, DEFAULT_CASE_TYPES } from "./seeders/default-case-types.ts";

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

  return { supabase, schema, user: user.data, member: member.data, org: org.data };
}

// SEEDER ENDPOINTS

// GET /cases/seed/preview - Preview default case types that would be seeded
app.get("/cases/seed/preview", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    await getSupabaseAndOrgInfo(orgId, userId); // Just for auth validation

    // Return the default configuration without creating anything
    return c.json({ 
      message: "Preview of default case types and templates",
      case_types: DEFAULT_CASE_TYPES.map(ct => ({
        name: ct.name,
        display_name: ct.display_name,
        description: ct.description,
        color: ct.color,
        icon: ct.icon,
        template_count: ct.folder_templates.length
      })),
      total_case_types: DEFAULT_CASE_TYPES.length,
      total_templates: DEFAULT_CASE_TYPES.reduce((sum, ct) => sum + ct.folder_templates.length, 0)
    }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /cases/seed/run - Run the seeder to create default case types and templates
app.post("/cases/seed/run", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, member } = await getSupabaseAndOrgInfo(orgId, userId);

    // Check if user has admin privileges (optional - you might want to restrict this)
    if (member.role !== 'admin' && member.role !== 'owner') {
      return c.json({ error: "Only administrators can run seeders" }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { force = false, case_types = null } = body;

    // Check if there are already case types
    const { data: existingCaseTypes, error: countError } = await supabase
      .schema(schema)
      .from('case_types')
      .select('id', { count: 'exact' });

    if (countError) {
      return c.json({ error: "Failed to check existing case types", details: countError }, 500);
    }

    if (existingCaseTypes && existingCaseTypes.length > 0 && !force) {
      return c.json({ 
        error: "Case types already exist. Use 'force: true' to seed anyway",
        existing_count: existingCaseTypes.length
      }, 400);
    }

    // Run the seeder
    try {
      await seedCaseTypes(supabase, schema);
      
      // Get the newly created case types count
      const { data: newCaseTypes, error: newCountError } = await supabase
        .schema(schema)
        .from('case_types')
        .select('id, name, display_name', { count: 'exact' });

      if (newCountError) {
        console.error("Error getting seeded case types count:", newCountError);
      }

      return c.json({ 
        success: true,
        message: "Default case types and templates seeded successfully",
        seeded_case_types: newCaseTypes?.length || 0,
        case_types: newCaseTypes || []
      }, 200);
    } catch (seedError: any) {
      console.error("Seeding error:", seedError);
      return c.json({ 
        error: "Failed to seed case types", 
        details: seedError.message 
      }, 500);
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
    const { supabase, schema, member } = await getSupabaseAndOrgInfo(orgId, userId);

    // Check if user has admin privileges
    if (member.role !== 'admin' && member.role !== 'owner') {
      return c.json({ error: "Only administrators can create custom case types" }, 403);
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
            name: caseTypeConfig.name || 'unknown',
            success: false,
            error: 'Missing required fields: name and display_name'
          });
          continue;
        }

        // Check if case type already exists
        const { data: existingCaseType } = await supabase
          .schema(schema)
          .from('case_types')
          .select('id')
          .eq('name', caseTypeConfig.name)
          .single();

        if (existingCaseType) {
          results.push({
            name: caseTypeConfig.name,
            success: false,
            error: 'Case type already exists'
          });
          continue;
        }

        // Create case type
        const { data: newCaseType, error: caseTypeError } = await supabase
          .schema(schema)
          .from('case_types')
          .insert({
            name: caseTypeConfig.name,
            display_name: caseTypeConfig.display_name,
            description: caseTypeConfig.description || null,
            color: caseTypeConfig.color || '#3B82F6',
            icon: caseTypeConfig.icon || 'folder',
          })
          .select('id')
          .single();

        if (caseTypeError) {
          results.push({
            name: caseTypeConfig.name,
            success: false,
            error: caseTypeError.message
          });
          continue;
        }

        // Create folder templates if provided
        let templatesCreated = 0;
        if (caseTypeConfig.folder_templates && Array.isArray(caseTypeConfig.folder_templates)) {
          for (const template of caseTypeConfig.folder_templates) {
            try {
              await supabase
                .schema(schema)
                .from('folder_templates')
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
              console.error(`Failed to create template ${template.name}:`, templateError);
            }
          }
        }

        results.push({
          name: caseTypeConfig.name,
          success: true,
          case_type_id: newCaseType.id,
          templates_created: templatesCreated
        });

      } catch (error: any) {
        results.push({
          name: caseTypeConfig.name || 'unknown',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return c.json({
      success: successCount > 0,
      message: `Seeded ${successCount} case types, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    }, 200);

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
      .eq("is_active", true)
      .order("name");

    if (error) {
      return c.json({ error: "Failed to fetch case types", details: error }, 500);
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
      .select(`
        *,
        folder_templates(
          id,
          name,
          path,
          parent_path,
          sort_order,
          is_required
        )
      `)
      .eq("id", caseTypeId)
      .eq("is_active", true)
      .single();

    if (error || !caseType) {
      return c.json({ error: "Case type not found" }, 404);
    }

    return c.json({ caseType }, 200);
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
    const { name, display_name, description, color, icon, folder_templates } = body;

    if (!name || !display_name) {
      return c.json({ error: "Missing required fields: name, display_name" }, 400);
    }

    // Validate name format (no spaces, lowercase, underscores allowed)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return c.json({
        error: "Name must contain only lowercase letters, numbers, and underscores"
      }, 400);
    }

    // Check if case type name already exists
    const { data: existingType } = await supabase
      .schema(schema)
      .from("case_types")
      .select("id")
      .eq("name", name)
      .single();

    if (existingType) {
      return c.json({ error: "A case type with this name already exists" }, 400);
    }

    // Create case type
    const { data: newCaseType, error: insertError } = await supabase
      .schema(schema)
      .from("case_types")
      .insert({
        name,
        display_name,
        description: description || null,
        color: color || '#3B82F6',
        icon: icon || 'folder',
      })
      .select()
      .single();

    if (insertError || !newCaseType) {
      return c.json({ error: "Failed to create case type", details: insertError }, 500);
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
        return c.json({
          error: "Name must contain only lowercase letters, numbers, and underscores"
        }, 400);
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
        return c.json({ error: "A case type with this name already exists" }, 400);
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
      return c.json({ error: "Case type not found or update failed", details: updateError }, 404);
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
        updated_at: new Date().toISOString() 
      })
      .eq("id", caseTypeId);

    if (error) {
      return c.json({ error: "Failed to delete case type", details: error }, 500);
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
      return c.json({ error: "Failed to fetch folder templates", details: error }, 500);
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
      return c.json({ error: "Failed to create folder template", details: insertError }, 500);
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
      return c.json({ error: "Template not found or update failed", details: updateError }, 404);
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
      return c.json({ error: "Failed to delete template", details: deleteError }, 500);
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
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const orderBy = url.searchParams.get("orderBy") || "created_at";
    const orderDirection = (url.searchParams.get("orderDirection") || "desc") as "asc" | "desc";
    const search = url.searchParams.get("search") || undefined;
    const caseTypeId = url.searchParams.get("caseTypeId") || undefined;

    // Check if we're getting a specific case by ID
    const pathParts = url.pathname.split("/");
    const caseId = pathParts[pathParts.length - 1];

    if (caseId && caseId !== "cases") {
      const { data: case_, error } = await supabase
        .schema(schema)
        .from("folder_cases")
        .select(`
          *,
          case_types(
            id,
            name,
            display_name,
            description,
            color,
            icon
          )
        `)
        .eq("id", caseId)
        .single();
      
      if (error || !case_) {
        return c.json({ error: "Case not found" }, 404);
      }
      
      return c.json({ case: case_ }, 200);
    }

    // Build query for listing cases
    let query = supabase
      .schema(schema)
      .from("folder_cases")
      .select(`
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        )
      `, { count: "exact" });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (caseTypeId) {
      query = query.eq("case_type_id", caseTypeId);
    }

    // Apply ordering and pagination
    query = query.order(orderBy, { ascending: orderDirection === "asc" });
    query = query.range(offset, offset + limit - 1);

    const { data: cases, error, count } = await query;

    if (error) {
      return c.json({ error: "Failed to fetch cases", details: error }, 500);
    }

    return c.json({
      cases: cases || [],
      total: count || 0,
      limit,
      offset,
    }, 200);
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

    const { data: case_, error } = await supabase
      .schema(schema)
      .from("folder_cases")
      .select(`
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        )
      `)
      .eq("id", caseId)
      .single();

    if (error || !case_) {
      return c.json({ error: "Case not found" }, 404);
    }

    return c.json({ case: case_ }, 200);
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
      await supabase
        .schema(schema)
        .from("storage_folders")
        .insert({
          name: template.name,
          path: template.path,
          case: caseId,
          created_by: userId,
          parent_folder_id: null, // We'll handle nesting in a future enhancement
        });
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
    const { supabase, schema, user, member } = await getSupabaseAndOrgInfo(orgId, userId);

    const body = await c.req.json();
    const { name, description, case_type_id } = body;

    if (!name) {
      return c.json({ error: "Missing required field: name" }, 400);
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
      .from("folder_cases")
      .select("id")
      .eq("name", name)
      .single();

    if (existingCase) {
      return c.json({ error: "A case with this name already exists" }, 400);
    }

    // Create new case
    const { data: newCase, error: insertError } = await supabase
      .schema(schema)
      .from("folder_cases")
      .insert({
        name,
        description: description || null,
        case_type_id,
      })
      .select()
      .single();

    if (insertError || !newCase) {
      return c.json({ error: "Failed to create case", details: insertError }, 500);
    }

    // Create folder structure from template
    await createFoldersFromTemplates(supabase, schema, case_type_id, newCase.id, member.id);

    // Fetch the created case with case type information
    const { data: caseWithType } = await supabase
      .schema(schema)
      .from("folder_cases")
      .select(`
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        )
      `)
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

    const body = await c.req.json();
    const { name, description, case_type_id } = body;

    if (!name && description === undefined && !case_type_id) {
      return c.json({
        error: "At least one field (name, description, or case_type_id) must be provided"
      }, 400);
    }

    // Check if case exists
    const { data: existingCase } = await supabase
      .schema(schema)
      .from("folder_cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (!existingCase) {
      return c.json({ error: "Case not found" }, 404);
    }

    // If name is being updated, check for uniqueness
    if (name && name !== existingCase.name) {
      const { data: duplicateName } = await supabase
        .schema(schema)
        .from("folder_cases")
        .select("id")
        .eq("name", name)
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
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (case_type_id !== undefined) updateData.case_type_id = case_type_id;

    const { data: updatedCase, error: updateError } = await supabase
      .schema(schema)
      .from("folder_cases")
      .update(updateData)
      .eq("id", caseId)
      .select(`
        *,
        case_types(
          id,
          name,
          display_name,
          description,
          color,
          icon
        )
      `)
      .single();

    if (updateError || !updatedCase) {
      return c.json({ error: "Failed to update case", details: updateError }, 500);
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
      .from("folder_cases")
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
      .from("folder_cases")
      .delete()
      .eq("id", caseId);

    if (deleteError) {
      return c.json({ error: "Failed to delete case", details: deleteError }, 500);
    }

    return c.json({ success: true, message: "Case deleted successfully" }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

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