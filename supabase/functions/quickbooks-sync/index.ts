import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import {
  QuickBooksBill,
  QuickBooksClient,
  QuickBooksPurchase,
} from "../_shared/quickbooks-client.ts";

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

app.use("/quickbooks-sync/*", extractUserAndOrgId);

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

// Sync a single expense record to QuickBooks
app.post("/quickbooks-sync/expense/:expenseId", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const expenseId = c.req.param("expenseId");

  const { supabase, schema, org } = await getSupabaseAndOrgInfo(orgId, userId);

  try {
    // Initialize QuickBooks client
    const qbClient = new QuickBooksClient(org.id, schema);
    await qbClient.initialize();

    // Get expense record
    const { data: expense, error: expenseError } = await supabase
      .schema(schema)
      .from("case_expenses")
      .select(
        `
        *,
        cases!inner(
          id,
          case_number,
          qb_sub_customer_id,
          qb_customer_id
        )
      `
      )
      .eq("id", expenseId)
      .single();

    if (expenseError || !expense) {
      return c.json({ error: "expense record not found" }, 404);
    }

    const { data: costType, error: costTypeError } = await supabase
      .schema(schema)
      .from("cost_types")
      .select("*")
      .eq("id", expense.cost_type_id)
      .single();

    if (costTypeError || !costType) {
      return c.json({ error: "Cost type not found" }, 404);
    }

    // Get account mapping
    const { data: mapping, error: mappingError } = await supabase
      .schema(schema)
      .from("qb_account_mappings")
      .select("*")
      .eq("org_id", orgId)
      .eq("cost_type_id", expense.cost_type_id)
      .single();

    if (mappingError || !mapping) {
      return c.json(
        {
          error: `No QuickBooks account mapping found for cost type: ${costType.name}`,
        },
        400
      );
    }

    if (!expense.payee_id) {
      return c.json({ error: "Payee not found" }, 404);
    }

    // Check if vendor exists or create one
    let vendorId = null;
    if (expense.payee_id) {
      const { data: payee, error: payeeError } = await supabase
        .schema(schema)
        .from("contacts")
        .select("*")
        .eq("id", expense.payee_id)
        .single();

      if (payeeError || !payee) {
        return c.json({ error: "Payee not found" }, 404);
      }

      //expense vender name is the name of payee in the expense table
      const { data: vendor } = await supabase
        .schema(schema)
        .from("qb_vendors")
        .select("qb_vendor_id")
        .eq("vendor_name", payee.full_name)
        .single();

      if (vendor?.qb_vendor_id) {
        vendorId = vendor.qb_vendor_id;
      } else {
        // Create vendor in QuickBooks
        const qbVendor = await qbClient.createVendor({
          DisplayName: payee.full_name,
        });

        vendorId = qbVendor.Vendor.Id;

        // Store vendor mapping
        await supabase.schema(schema).from("qb_vendors").insert({
          vendor_name: payee.full_name,
          qb_vendor_id: vendorId,
          qb_display_name: qbVendor.Vendor.DisplayName,
        });
      }
    }

    // Determine which QuickBooks entity to create
    let qbResponse;

    if (expense.qb_entity_type === "Bill" && vendorId) {
      // Create Bill
      const bill = {
        VendorRef: { value: vendorId },
        TxnDate: expense.invoice_date,
        Line: [
          {
            DetailType: "AccountBasedExpenseLineDetail",
            Amount: expense.amount,
            Description: expense.description,
            AccountBasedExpenseLineDetail: {
              AccountRef: { value: mapping.qb_account_id },
              CustomerRef: expense.cases.qb_sub_customer_id
                ? { value: expense.cases.qb_sub_customer_id }
                : undefined,
              ClassRef: mapping.qb_class_id
                ? { value: mapping.qb_class_id }
                : undefined,
            },
          },
        ],
      };

      qbResponse = await qbClient.createBill(bill as QuickBooksBill);
    } else {
      // Create Purchase (default)
      const purchase = {
        PaymentType: "Cash",
        AccountRef: { value: "4" }, // Default to operating account, should be configurable
        TxnDate: expense.invoice_date,
        Line: [
          {
            DetailType: "AccountBasedExpenseLineDetail",
            Amount: expense.amount,
            Description: expense.description,
            AccountBasedExpenseLineDetail: {
              AccountRef: { value: mapping.qb_account_id },
              CustomerRef: expense.cases.qb_sub_customer_id
                ? { value: expense.cases.qb_sub_customer_id }
                : undefined,
              ClassRef: mapping.qb_class_id
                ? { value: mapping.qb_class_id }
                : undefined,
            },
          },
        ],
      };

      if (vendorId) {
        (purchase as any).EntityRef = { value: vendorId, type: "Vendor" };
      }

      qbResponse = await qbClient.createPurchase(
        purchase as QuickBooksPurchase
      );
    }

    // Update expense record with QuickBooks ID
    const qbId = qbResponse.Purchase?.Id || qbResponse.Bill?.Id;

    const { error: updateError } = await supabase
      .schema(schema)
      .from("case_expenses")
      .update({
        qb_sync_status: "synced",
        qb_id: qbId,
        qb_last_sync_at: new Date().toISOString(),
        qb_sync_error: null,
      })
      .eq("id", expenseId);

    if (updateError) {
      console.error("Failed to update expense record:", updateError);
      return c.json({ error: "Failed to update expense record" }, 500);
    }

    return c.json({
      success: true,
      qb_id: qbId,
      entity_type: expense.qb_entity_type || "Purchase",
    });
  } catch (error: any) {
    console.error("Sync error:", error);

    // Update expense record with error
    await supabase
      .schema(schema)
      .from("case_expenses")
      .update({
        qb_sync_status: "error",
        qb_sync_error: error.message,
        qb_last_sync_at: new Date().toISOString(),
      })
      .eq("id", expenseId);

    return c.json({ error: error.message }, 500);
  }
});

// Sync multiple expense records
app.post("/quickbooks-sync/expense/batch", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const { expenseIds } = await c.req.json();

  const { schema, org } = await getSupabaseAndOrgInfo(orgId, userId);

  if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
    return c.json({ error: "Invalid expense IDs" }, 400);
  }

  const results = [];
  const qbClient = new QuickBooksClient(org.id, schema);
  await qbClient.initialize();

  for (const expenseId of expenseIds) {
    try {
      // Process each expense record
      const response = await fetch(
        `${c.req.url.replace("/batch", "")}/${expenseId}`,
        {
          method: "POST",
          headers: c.req.raw.headers,
        }
      );

      const result = await response.json();
      results.push({ id: expenseId, ...result });
    } catch (error: any) {
      results.push({
        id: expenseId,
        success: false,
        error: error.message,
      });
    }
  }

  return c.json({ results });
});

// Sync customer/case to QuickBooks
app.post("/quickbooks-sync/customer/:caseId", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const caseId = c.req.param("caseId");

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const { supabase, schema, org } = await getSupabaseAndOrgInfo(orgId, userId);

  try {
    const qbClient = new QuickBooksClient(org.id, schema);
    await qbClient.initialize();

    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .schema(schema)
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return c.json({ error: "Case not found" }, 404);
    }

    // Check if customer already exists in QuickBooks
    if (caseData.qb_customer_id) {
      return c.json({
        success: true,
        qb_customer_id: caseData.qb_customer_id,
        qb_sub_customer_id: caseData.qb_sub_customer_id,
        message: "Customer already synced",
      });
    }

    // Create or find parent customer (client)
    let parentCustomerId = null;

    const { data: client, error: clientError } = await supabase
      .schema(schema)
      .from("contacts")
      .select("*")
      .eq("id", caseData.claimant_id)
      .single();

    if (clientError || !client) {
      return c.json({ error: "Client not found" }, 404);
    }

    // For now, we'll create a generic parent customer
    // In production, you'd want to link this to actual client records
    const parentQuery = `SELECT * FROM Customer WHERE DisplayName = '${
      client.full_name || "Default Client"
    }'`;
    const parentResult = await qbClient.queryCustomers(parentQuery);

    if (parentResult.QueryResponse?.Customer?.length > 0) {
      parentCustomerId = parentResult.QueryResponse.Customer[0].Id;
    } else {
      // Create parent customer
      const parentCustomer = await qbClient.createCustomer({
        DisplayName: client.full_name || "Default Client",
        CompanyName: client.full_name,
      });
      parentCustomerId = parentCustomer.Customer.Id;
    }

    // Create sub-customer for the case
    const subCustomer = await qbClient.createCustomer({
      DisplayName: `Case ${caseData.case_number}`,
      CompanyName: caseData.full_name,
      ParentRef: { value: parentCustomerId },
      Job: true,
    });

    const subCustomerId = subCustomer.Customer.Id;

    // Update case with QuickBooks IDs
    const { error: updateError } = await supabase
      .schema(schema)
      .from("cases")
      .update({
        qb_customer_id: parentCustomerId,
        qb_sub_customer_id: subCustomerId,
        qb_sync_status: "synced",
        qb_last_sync_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    if (updateError) {
      console.error("Failed to update case:", updateError);
    }

    return c.json({
      success: true,
      qb_customer_id: parentCustomerId,
      qb_sub_customer_id: subCustomerId,
    });
  } catch (error: any) {
    console.error("Customer sync error:", error);

    await supabase
      .schema(schema)
      .from("cases")
      .update({
        qb_sync_status: "error",
        qb_last_sync_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    return c.json({ error: error.message }, 500);
  }
});

// Get QuickBooks accounts for mapping
app.get("/quickbooks-sync/accounts", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  const { schema, org } = await getSupabaseAndOrgInfo(orgId, userId);

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const qbClient = new QuickBooksClient(org.id, schema);
    await qbClient.initialize();

    const accounts = await qbClient.getAccounts();

    return c.json({
      accounts: accounts.QueryResponse?.Account || [],
    });
  } catch (error: any) {
    console.error("Failed to fetch accounts:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get QuickBooks classes for mapping
app.get("/quickbooks-sync/classes", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  const { schema, org } = await getSupabaseAndOrgInfo(orgId, userId);

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const qbClient = new QuickBooksClient(org.id, schema);
    await qbClient.initialize();

    const classes = await qbClient.getClasses();

    return c.json({
      classes: classes.QueryResponse?.Class || [],
    });
  } catch (error: any) {
    console.error("Failed to fetch classes:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get existing account mappings
app.get("/quickbooks-sync/mappings", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

  const { data, error } = await supabase
    .schema(schema)
    .from("qb_account_mappings")
    .select("*")
    .eq("org_id", orgId);

  if (error) {
    console.error("Failed to fetch mappings:", error);
    return c.json({ error: "Failed to fetch mappings" }, 500);
  }

  return c.json({ mappings: data || [] });
});

// Save account mapping
app.post("/quickbooks-sync/save-mapping", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const mapping = await c.req.json();
  const {
    cost_type_id,
    qb_account_id,
    qb_account_name,
    qb_class_id,
    qb_class_name,
  } = mapping;

  if (!userId || !orgId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

  const { error } = await supabase
    .schema(schema)
    .from("qb_account_mappings")
    .upsert({
      org_id: orgId,
      cost_type_id,
      qb_account_id,
      qb_account_name,
      qb_class_id,
      qb_class_name,
    });

  if (error) {
    console.error("Failed to save mapping:", error);
    return c.json({ error: "Failed to save mapping" }, 500);
  }

  return c.json({ success: true });
});

export default app;
