// supabase/functions/clerk-webhook/index.ts
// Supabase Edge Function: Clerk Webhook Listener for organization.created (using Hono, DB-based migrations)
import { createClient } from "npm:@supabase/supabase-js";
import { verifyWebhook } from "npm:@clerk/backend/webhooks";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { seedCaseTypes } from "../_shared/default-case-types.ts";
import { seedTaskCategories } from "../_shared/default-task-categories.ts";

async function runTenantMigrations(schemaName: string) {
  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  console.log("databaseUrl :", databaseUrl);
  const client = new Client(databaseUrl!);
  await client.connect();
  try {
    await client.queryArray(`
      CREATE TABLE IF NOT EXISTS private.schema_migrations (
        id serial PRIMARY KEY,
        schema_name text NOT NULL,
        migration_filename text NOT NULL,
        applied_at timestamp NOT NULL DEFAULT now(),
        UNIQUE(schema_name, migration_filename)
      );
    `);
    // Get applied migrations for this tenant
    const { rows: appliedRows } = await client.queryObject<
      { migration_filename: string }
    >(
      `SELECT migration_filename FROM private.schema_migrations WHERE schema_name = $1`,
      [schemaName],
    );
    const applied = new Set(appliedRows.map((r) => r.migration_filename));
    // Get all migration files from the DB, ordered by version/filename
    const { rows: migrationRows } = await client.queryObject<
      { filename: string; sql: string }
    >(
      `SELECT filename, sql FROM public.tenant_migration_files ORDER BY filename`,
    );

    // Check if the schema already exists
    const { rows: schemaExistsRows } = await client.queryObject<
      { exists: boolean }
    >(
      `SELECT EXISTS (
        SELECT 1 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      ) AS exists`,
      [schemaName],
    );

    // If the schema does not exist, create it
    if (!schemaExistsRows[0].exists) {
      await client.queryArray(`CREATE SCHEMA ${schemaName}`);
    }

    // Apply each migration if not already applied
    for (const { filename, sql } of migrationRows) {
      if (applied.has(filename)) continue;
      const migrationSql = sql.replace(/\{\{schema_name\}\}/g, schemaName);
      try {
        await client.queryArray("BEGIN");
        await client.queryArray(migrationSql);
        await client.queryArray(
          `INSERT INTO private.schema_migrations (schema_name, migration_filename) VALUES ($1, $2)`,
          [schemaName, filename],
        );
        await client.queryArray("COMMIT");
      } catch (err) {
        await client.queryArray("ROLLBACK");
        return {
          success: false,
          error: `Migration ${filename} failed: ${err}`,
        };
      }

      // Run the expose_schemas function
      await client.queryArray(`SELECT private.expose_schemas()`);
      console.log(
        `Successfully applied migration ${filename} to schema ${schemaName}`,
      );
      console.log(`Successfully exposed schemas for schema ${schemaName}`);
    }
    return { success: true };
  } finally {
    await client.end();
  }
}

Deno.serve(async (req) => {
  // Verify webhook signature
  const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500 },
    );
  }
  let event;
  try {
    event = await verifyWebhook(req, { signingSecret: webhookSecret });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid webhook signature" }),
      { status: 401 },
    );
  }

  // Create supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Supabase credentials not configured" }),
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  switch (event.type) {
    case "user.created": {
      console.log({
        clerk_user_id: event.data.id,
        email: event.data.email_addresses[0].email_address,
        full_name: event.data.first_name + " " + event.data.last_name,
        created_at: new Date(event.data.created_at).toISOString(),
        updated_at: new Date(event.data.updated_at).toISOString(),
      });
      const { data: user, error } = await supabase.schema("private")
        .from("users")
        .insert([
          {
            clerk_user_id: event.data.id,
            email: event.data.email_addresses[0].email_address,
            full_name: event.data.first_name + " " + event.data.last_name,
            created_at: new Date(event.data.created_at).toISOString(),
            updated_at: new Date(event.data.updated_at).toISOString(),
          },
        ])
        .select()
        .single();
      if (error) {
        console.error("Error creating user:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
      return new Response(JSON.stringify({ user }), { status: 200 });
    }
    case "user.updated": {
      const { data: user, error } = await supabase.schema("private")
        .from("users")
        .update({
          full_name: event.data.first_name + " " + event.data.last_name,
          updated_at: new Date(event.data.updated_at).toISOString(),
        })
        .eq("clerk_user_id", event.data.id)
        .select()
        .single();
      if (error) {
        console.error("Error updating user:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
      return new Response(JSON.stringify({ user }), { status: 200 });
    }
    case "organization.created": {
      // Insert org into DB
      const schemaName = `${event.data.id}`;
      const { data, error } = await supabase.schema("private")
        .from("organizations")
        .insert([
          {
            clerk_organization_id: event.data.id,
            name: event.data.name,
            subdomain: event.data.slug ||
              event.data.name.toLowerCase().replace(/\s+/g, "-"),
            schema_name: schemaName,
            subscription_tier: "basic",
            status: "active",
            created_at: new Date(event.data.created_at).toISOString(),
            updated_at: new Date(event.data.updated_at).toISOString(),
          },
        ])
        .select()
        .single();
        
      if (error) {
        console.error("Error creating organization:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
      // Run tenant migrations
      const migrationResult = await runTenantMigrations(schemaName);
      if (!migrationResult.success) {
        console.error("Migration error:", migrationResult.error);
        return new Response(JSON.stringify({ error: migrationResult.error }), {
          status: 500,
        });
      }

      // Seed case types
      await seedCaseTypes(supabase, schemaName.toLowerCase());
      await seedTaskCategories(supabase, schemaName.toLowerCase());

      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    case "organization.updated": {
      const { data, error } = await supabase.schema("private")
        .from("organizations")
        .update({
          name: event.data.name,
          updated_at: new Date(event.data.updated_at).toISOString(),
        })
        .eq("clerk_organization_id", event.data.id)
        .select()
        .single();
      if (error) {
        console.error("Error updating organization:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    case "organizationMembership.created": {
      console.log("organizationMembership.created :", event.data);
      const { data: organization, error: organizationError } = await supabase
        .schema("private")
        .from("organizations")
        .select()
        .eq("clerk_organization_id", event.data.organization?.id)
        .single();
      if (organizationError) {
        console.error("Error getting organization:", organizationError);
        return new Response(
          JSON.stringify({ error: organizationError.message }),
          {
            status: 500,
          },
        );
      }
      console.log("organization :", organization);


      const { data: user, error: userError } = await supabase.schema("private")
        .from("users")
        .select()
        .eq("clerk_user_id", event.data.public_user_data?.user_id)
        .single();
      if (userError) {
        console.error("Error getting user:", userError);
        return new Response(JSON.stringify({ error: userError.message }), {
          status: 500,
        });
      }
      console.log("user :", user);
      const { data, error } = await supabase.schema("private")
        .from("organization_members")
        .insert([
          {
            user_id: user.id,
            organization_id: organization.id,
            role: event.data.role === "org:admin" ? "owner" : "client", // Update with user invitation
            status: "active",
            joined_at: new Date(event.data.created_at).toISOString(),
          },
        ])
        .select()
        .single();
      if (error) {
        console.error("Error creating organization member:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    case "organizationMembership.updated": {
      const { data, error } = await supabase.schema("private")
        .from("organization_members")
        .update({
          user_id: event.data.public_user_data?.user_id,
          organization_id: event.data.organization?.id,
          role: event.data.role,
          status: "active",
          joined_at: new Date(event.data.created_at).toISOString(),
        })
        .eq("id", event.data.id)
        .select()
        .single();
      if (error) {
        console.error("Error updating organization member:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    default: {
      console.log("Unhandled event type:", JSON.stringify(event, null, 2));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
  }
});
