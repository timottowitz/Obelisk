
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

app.use("/members", extractUserAndOrgId);

app.options("*", (c) => {
  return c.text("", 200);
});

app.get("/members", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();
    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }

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

    // Get all organization members
    const { data: members, error: membersError } = await supabase
      .schema("private")
      .from("organization_members")
      .select(`
        id,
        role,
        status,
        joined_at,
        users:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq("organization_id", org.data?.id)
      .eq("status", "active")

    if (membersError) {
      return c.json(
        { error: "Failed to fetch organization members", details: membersError },
        500
      );
    }

    const formattedMembers = members.map((member: any) => ({
      id: member.id,
      userId: member.users.id,
      email: member.users.email,
      fullName: member.users.full_name,
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at,
    }));

    return c.json(formattedMembers, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
