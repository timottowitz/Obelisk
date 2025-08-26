// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

app.use("/events/*", extractUserAndOrgId);

app.options("*", (c) => {
  return c.text("", 200);
});

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

//Get all events
app.get("/events", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "5");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const {
      data: events,
      count,
      error,
    } = await supabase
      .schema(schema)
      .from("case_events")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(limit * (page - 1), limit * page - 1);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    const caseDetailedEvents = [];

    for (const event of events) {
      const { data: caseData, error: caseError } = await supabase
        .schema(schema)
        .from("cases")
        .select("*")
        .eq("id", event.case_id)
        .single();

      if (caseError) {
        return c.json({ error: caseError.message }, 500);
      }

      caseDetailedEvents.push({ ...event, case_number: caseData.case_number });
    }

    return c.json({ data: caseDetailedEvents, count: count }, 200);
  } catch (error) {
    return c.json(
      { "Failed to fetch events for this organization": error },
      500
    );
  }
});

//Get all events for a case
app.get("/events/cases/:caseId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "5");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, count, error } = await supabase
      .schema(schema)
      .from("case_events")
      .select("*", { count: "exact" })
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .range(limit * (page - 1), limit * page - 1);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ data, count }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
