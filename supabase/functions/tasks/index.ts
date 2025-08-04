// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
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

app.options("*", (c) => {
  return c.text("", 200);
});

app.use("/tasks/*", extractUserAndOrgId);

//Helper function to get supabase client and org info

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

//Get all tasks
app.get("/tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "5");

  const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

  try {
    const {
      data: tasks,
      error,
      count,
    } = await supabase
      .schema(schema)
      .from("case_tasks")
      .select("*", { count: "exact" })
      .order("due_date", { ascending: true })
      .range(limit * (page - 1), limit * page - 1);

    if (error) {
      return c.json({ "Failed to fetch tasks": error.message }, 500);
    }

    const caseDetailedTasks = [];
    for (const task of tasks) {
      const { data: caseData, error: caseError } = await supabase
        .schema(schema)
        .from("cases")
        .select("*")
        .eq("id", task.case_id)
        .single();

      if (caseError) {
        return c.json({ "Failed to fetch case": caseError.message }, 500);
      }

      caseDetailedTasks.push({
        ...task,
        case_number: caseData.case_number,
        claimant: caseData.claimant,
        respondent: caseData.respondent,
      });
    }
    return c.json({
      data: caseDetailedTasks,
      count,
    });
  } catch (error) {
    return c.json({ "Failed to fetch tasks": error }, 500);
  }
});

export default app;
