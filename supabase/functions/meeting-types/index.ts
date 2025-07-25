// Meeting Types Edge Function
// Handles CRUD operations for custom meeting types

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";

const app = new Hono();

// Enable CORS
app.use("*", cors({
  origin: ["http://localhost:3000", "https://yourdomain.com"],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Middleware to extract user and org info
app.use("/meeting-types/*", extractUserAndOrgId);

// GET /meeting-types - List all meeting types for the current user
app.get("/meeting-types", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and schema
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
      return c.json({ error: "Organization schema not found" }, 404);
    }

    // Get user and member info
    const user = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (user.error) {
      return c.json({ error: "User not found" }, 404);
    }

    const member = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data?.id)
      .eq("organization_id", org.data?.id)
      .single();

    if (member.error) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Get meeting types for this member
    const { data: meetingTypes, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("*")
      .eq("member_id", member.data?.id)
      .eq("is_active", true)
      .order("display_name");

    if (error) {
      console.error("Error fetching meeting types:", error);
      return c.json({ error: "Failed to fetch meeting types" }, 500);
    }

    return c.json({ meetingTypes: meetingTypes || [] });
  } catch (error) {
    console.error("Error in GET /meeting-types:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /meeting-types/:id - Get a specific meeting type
app.get("/meeting-types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const meetingTypeId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and schema
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
      return c.json({ error: "Organization schema not found" }, 404);
    }

    // Get user and member info
    const user = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (user.error) {
      return c.json({ error: "User not found" }, 404);
    }

    const member = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data?.id)
      .eq("organization_id", org.data?.id)
      .single();

    if (member.error) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Get specific meeting type
    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("*")
      .eq("id", meetingTypeId)
      .eq("member_id", member.data?.id)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching meeting type:", error);
      return c.json({ error: "Meeting type not found" }, 404);
    }

    return c.json({ meetingType });
  } catch (error) {
    console.error("Error in GET /meeting-types/:id:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /meeting-types - Create a new meeting type
app.post("/meeting-types", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const body = await c.req.json();
    const { name, display_name, description, system_prompt, output_format = "json" } = body;

    // Validate required fields
    if (!name || !display_name || !system_prompt) {
      return c.json({ error: "Name, display name, and system prompt are required" }, 400);
    }

    // Validate name format (no spaces, lowercase, underscores allowed)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return c.json({ 
        error: "Name must contain only lowercase letters, numbers, and underscores" 
      }, 400);
    }

    // Validate output format
    if (!["json", "text", "markdown"].includes(output_format)) {
      return c.json({ error: "Invalid output format" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and schema
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
      return c.json({ error: "Organization schema not found" }, 404);
    }

    // Get user and member info
    const user = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (user.error) {
      return c.json({ error: "User not found" }, 404);
    }

    const member = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data?.id)
      .eq("organization_id", org.data?.id)
      .single();

    if (member.error) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Check if name already exists for this member
    const { data: existingType } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("id")
      .eq("member_id", member.data?.id)
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (existingType) {
      return c.json({ error: "A meeting type with this name already exists" }, 409);
    }

    // Create the meeting type
    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .insert({
        name,
        display_name,
        description,
        system_prompt,
        output_format,
        member_id: member.data?.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating meeting type:", error);
      return c.json({ error: "Failed to create meeting type" }, 500);
    }

    return c.json({ meetingType }, 201);
  } catch (error) {
    console.error("Error in POST /meeting-types:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// PUT /meeting-types/:id - Update a meeting type
app.put("/meeting-types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const meetingTypeId = c.req.param("id");

  try {
    const body = await c.req.json();
    const { name, display_name, description, system_prompt, output_format, is_active } = body;

    // Validate name format if provided
    if (name) {
      const nameRegex = /^[a-z0-9_]+$/;
      if (!nameRegex.test(name)) {
        return c.json({ 
          error: "Name must contain only lowercase letters, numbers, and underscores" 
        }, 400);
      }
    }

    // Validate output format if provided
    if (output_format && !["json", "text", "markdown"].includes(output_format)) {
      return c.json({ error: "Invalid output format" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and schema
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
      return c.json({ error: "Organization schema not found" }, 404);
    }

    // Get user and member info
    const user = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (user.error) {
      return c.json({ error: "User not found" }, 404);
    }

    const member = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data?.id)
      .eq("organization_id", org.data?.id)
      .single();

    if (member.error) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Check if name already exists for this member (excluding current type)
    if (name) {
      const { data: existingType } = await supabase
        .schema(schema)
        .from("meeting_types")
        .select("id")
        .eq("member_id", member.data?.id)
        .eq("name", name)
        .eq("is_active", true)
        .neq("id", meetingTypeId)
        .single();

      if (existingType) {
        return c.json({ error: "A meeting type with this name already exists" }, 409);
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;
    if (output_format !== undefined) updateData.output_format = output_format;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update the meeting type
    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .update(updateData)
      .eq("id", meetingTypeId)
      .eq("member_id", member.data?.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating meeting type:", error);
      return c.json({ error: "Failed to update meeting type" }, 500);
    }

    if (!meetingType) {
      return c.json({ error: "Meeting type not found" }, 404);
    }

    return c.json({ meetingType });
  } catch (error) {
    console.error("Error in PUT /meeting-types/:id:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// DELETE /meeting-types/:id - Delete a meeting type
app.delete("/meeting-types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const meetingTypeId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and schema
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
      return c.json({ error: "Organization schema not found" }, 404);
    }

    // Get user and member info
    const user = await supabase
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (user.error) {
      return c.json({ error: "User not found" }, 404);
    }

    const member = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("user_id", user.data?.id)
      .eq("organization_id", org.data?.id)
      .single();

    if (member.error) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Soft delete the meeting type
    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", meetingTypeId)
      .eq("member_id", member.data?.id)
      .select()
      .single();

    if (error) {
      console.error("Error deleting meeting type:", error);
      return c.json({ error: "Failed to delete meeting type" }, 500);
    }

    if (!meetingType) {
      return c.json({ error: "Meeting type not found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /meeting-types/:id:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Handle 404
app.notFound((c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});

// Export the app
Deno.serve(app.fetch);
