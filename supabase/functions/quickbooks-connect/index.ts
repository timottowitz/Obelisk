import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id"],
    credentials: true,
  })
);

app.use("/quickbooks-connect/*", extractUserAndOrgId);

const QUICKBOOKS_CLIENT_ID = Deno.env.get("QUICKBOOKS_CLIENT_ID")!;
const QUICKBOOKS_CLIENT_SECRET = Deno.env.get("QUICKBOOKS_CLIENT_SECRET")!;
const QUICKBOOKS_REDIRECT_URI =
  "http://localhost:3001/dashboard/settings/integrations/quickbooks";
const QUICKBOOKS_ENVIRONMENT =
  Deno.env.get("QUICKBOOKS_ENVIRONMENT") || "sandbox";

const QUICKBOOKS_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";

const QUICKBOOKS_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

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

// Generate OAuth authorization URL
app.get("/quickbooks-connect/connect", extractUserAndOrgId, async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  const { supabase, schema, user, member, org } = await getSupabaseAndOrgInfo(
    orgId,
    userId
  );

  // Generate CSRF state token
  const state = crypto.randomUUID();

  // Store state temporarily in database for verification

  // Store state in a temporary table (you might want to add this to migrations)
  const { data, error } = await supabase
    .schema("private")
    .from("oauth_states")
    .insert({
      state,
      org_id: org.id,
      user_id: user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })
    .select()
    .single();

  console.log(data, error);

  if (error || !data) {
    console.error("Failed to store state:", error);
    return c.json({ error: "Failed to store state" }, 500);
  }

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: QUICKBOOKS_CLIENT_ID,
    redirect_uri: QUICKBOOKS_REDIRECT_URI,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state: state,
  });

  const authUrl = `${QUICKBOOKS_AUTH_URL}?${params.toString()}`;

  return c.json({ authUrl });
});

// Handle OAuth callback
app.get("/quickbooks-connect/callback", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  const { code, state, realmId, error } = c.req.query();

  if (error) {
    return c.json({ error: `QuickBooks authorization failed: ${error}` }, 400);
  }

  if (!code || !state || !realmId) {
    return c.json({ error: "Missing required parameters" }, 400);
  }

  const { supabase, schema, user, member, org } = await getSupabaseAndOrgInfo(
    orgId,
    userId
  );

  // Verify state token
  const { data: stateData, error: stateError } = await supabase
    .schema("private")
    .from("oauth_states")
    .select("org_id, user_id")
    .eq("state", state)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (stateError || !stateData) {
    return c.json({ error: "Invalid or expired state token" }, 400);
  }

  // Delete used state token
  await supabase
    .schema("private")
    .from("oauth_states")
    .delete()
    .eq("state", state);

  // Exchange authorization code for tokens
  const tokenBody = {
    grant_type: "authorization_code",
    code: code as string,
    redirect_uri: QUICKBOOKS_REDIRECT_URI,
  };

  const authHeader = btoa(
    `${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`
  );

  const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(tokenBody).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token exchange failed:", errorText);
    return c.json({ error: "Failed to exchange authorization code" }, 500);
  }

  const tokenData = await tokenResponse.json();

  // Calculate token expiry
  const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
  // Store or update QuickBooks connection
  const { error: upsertError } = await supabase
    .schema("private")
    .from("quickbooks_connections")
    .upsert(
      {
        org_id: stateData.org_id,
        realm_id: realmId as string,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: tokenExpiry.toISOString(),
        is_sandbox: QUICKBOOKS_ENVIRONMENT === "sandbox",
      },
      {
        onConflict: "org_id",
      }
    );

  if (upsertError) {
    console.error("Failed to store QuickBooks connection:", upsertError);
    return c.json({ error: "Failed to save connection" }, 500);
  }

  // Return success with redirect URL for frontend
  return c.json(
    {
      success: true,
      message: "Successfully connected to QuickBooks",
    },
    200
  );
});

// Refresh access token
app.post("/quickbooks-connect/refresh", extractUserAndOrgId, async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  const { supabase, org } = await getSupabaseAndOrgInfo(orgId, userId);

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Get current connection
  const { data: connection, error: fetchError } = await supabase
    .schema("private")
    .from("quickbooks_connections")
    .select("*")
    .eq("org_id", org.id)
    .single();

  if (fetchError || !connection) {
    return c.json({ error: "No QuickBooks connection found" }, 404);
  }

  // Refresh token
  const tokenBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
  });

  const authHeader = btoa(
    `${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`
  );

  const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenBody.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token refresh failed:", errorText);
    return c.json({ error: "Failed to refresh token" }, 500);
  }

  const tokenData = await tokenResponse.json();

  // Update stored tokens
  const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

  const { error: updateError } = await supabase
    .schema("private")
    .from("quickbooks_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: tokenExpiry.toISOString(),
    })
    .eq("org_id", org.id);

  if (updateError) {
    console.error("Failed to update tokens:", updateError);
    return c.json({ error: "Failed to update tokens" }, 500);
  }

  return c.json({
    success: true,
    expires_at: tokenExpiry.toISOString(),
  });
});

// Disconnect QuickBooks
app.delete("/quickbooks-connect/disconnect", extractUserAndOrgId, async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  const { supabase, org } = await getSupabaseAndOrgInfo(orgId, userId);

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { error } = await supabase
    .schema("private")
    .from("quickbooks_connections")
    .delete()
    .eq("org_id", org.id);

  if (error) {
    console.error("Failed to disconnect QuickBooks:", error);
    return c.json({ error: "Failed to disconnect" }, 500);
  }

  return c.json({ success: true });
});

// Get connection status
app.get("/quickbooks-connect/status", extractUserAndOrgId, async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const { supabase, org } = await getSupabaseAndOrgInfo(orgId, userId);

  const { data: connection, error } = await supabase
    .schema("private")
    .from("quickbooks_connections")
    .select("realm_id, token_expiry, is_sandbox")
    .eq("org_id", org.id)
    .single();

  if (error || !connection) {
    return c.json({ connected: false });
  }

  const isExpired = new Date(connection.token_expiry) < new Date();

  return c.json({
    connected: true,
    realm_id: connection.realm_id,
    is_sandbox: connection.is_sandbox,
    expired: isExpired,
    expires_at: connection.token_expiry,
  });
});

export default app;
