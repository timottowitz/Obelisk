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
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const { data: expenseTypes, error: expenseTypesError } = await supabase
      .schema(schema)
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
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: expenseType, error: expenseTypeError } = await supabase
      .schema(schema)
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

//get expenses for a case
app.get("/expenses/cases/:caseId", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const caseId = c.req.param("caseId");
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "5");
  const filterBy = url.searchParams.get("filterBy") || "all";
  const filterValue = url.searchParams.get("filterValue") || "";
  const sortBy = url.searchParams.get("sortBy") || "created_date";
  const sortDir = url.searchParams.get("sortDir") || "desc";

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const {
      data: expenses,
      error: expensesError,
    } = await supabase
      .schema(schema)
      .from("case_expenses")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: sortDir === "asc" });

    if (expensesError) {
      return c.json({ error: expensesError.message }, 500);
    }

    let totalAmount = 0;

    for (const expense of expenses) {
      const { data: expenseType, error: expenseTypeError } = await supabase
        .schema(schema)
        .from("expense_types")
        .select("*")
        .eq("id", expense.expense_type_id)
        .single();
      if (expenseTypeError) {
        return c.json({ error: expenseTypeError.message }, 500);
      }
      expense.expense_type = expenseType.name;

      if (expense.payee_id) {
        const { data: payee, error: payeeError } = await supabase
          .schema(schema)
          .from("contacts")
          .select("id, full_name, emails, phones, addresses")
          .eq("id", expense.payee_id)
          .single();
        if (payeeError) {
          return c.json({ error: payeeError.message }, 500);
        }
        expense.payee = payee;
      } else {
        expense.payee = null;
      }

      if (expense.attachment_id) {
        const { data: attachment, error: attachmentError } = await supabase
          .schema(schema)
          .from("storage_files")
          .select("name")
          .eq("id", expense.attachment_id)
          .single();
        if (attachmentError) {
          return c.json({ error: attachmentError.message }, 500);
        }
        expense.attachment = attachment;
      } else {
        expense.attachment = null;
      }

      if (expense.copy_of_check_id) {
        const { data: copyOfCheck, error: copyOfCheckError } = await supabase
          .schema(schema)
          .from("storage_files")
          .select("name")
          .eq("id", expense.copy_of_check_id)
          .single();
        if (copyOfCheckError) {
          return c.json({ error: copyOfCheckError.message }, 500);
        }
        expense.copy_of_check = copyOfCheck;
      } else {
        expense.copy_of_check = null;
      }

      totalAmount += expense.amount;
    }

    let filteredExpenses = expenses;

    if (filterBy !== "all" && filterValue !== "") {
      switch (filterBy) {
        case "expense_type":
          filteredExpenses = expenses.filter(
            (expense: any) =>
              expense.expense_type
                .toLowerCase()
                .includes(filterValue.toLowerCase())
          );
          break;
        case "payee":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.payee
              ? expense.payee.full_name
                  .toLowerCase()
                  .includes(filterValue.toLowerCase())
              : false
          );
          break;
        case "type":
          filteredExpenses = filteredExpenses.filter(
            (expense: any) =>
              expense.type
                .toLowerCase()
                .includes(filterValue.toLowerCase())
          );
          break;
        case "invoice_number":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.invoice_number.includes(filterValue)
          );
          break;
        case "attachment":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.attachment
              ? expense.attachment.name
                  .toLowerCase()
                  .includes(filterValue.toLowerCase())
              : false
          );
          break;
        case "invoice_date":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.invoice_date
              ? expense.invoice_date.includes(filterValue)
              : false
          );
          break;
        case "due_date":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.due_date ? expense.due_date.includes(filterValue) : false
          );
          break;
        case "bill_no":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.bill_no.includes(filterValue)
          );
          break;
        case "description":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.description
              .toLowerCase()
              .includes(filterValue.toLowerCase())
          );
          break;
        case "memo":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.memo
              .toLowerCase()
              .includes(filterValue.toLowerCase())
          );
          break;
        case "notes":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.notes
              .toLowerCase()
              .includes(filterValue.toLowerCase())
          );
          break;
        case "notify_admin":
          filteredExpenses = filteredExpenses.filter(
            (expense: any) =>
              expense.notify_admin_of_check_payment === filterValue
          );
          break;
        case "create_in_quickbooks":
          filteredExpenses = filteredExpenses.filter(
            (expense: any) =>
              expense.create_checking_quickbooks === (filterValue === "true")
          );
          break;
        case "create_billing_item":
          filteredExpenses = filteredExpenses.filter(
            (expense: any) =>
              expense.create_billing_item === (filterValue === "true")
          );
          break;
        case "date_of_check":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.date_of_check
              ? expense.date_of_check.includes(filterValue)
              : false
          );
          break;
        case "check_number":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.check_number.includes(filterValue)
          );
          break;
        case "last_update_from_quickbooks":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.last_update_from_quickbooks
              .toLowerCase()
              .includes(filterValue.toLowerCase())
          );
          break;
        case "copy_of_check":
          filteredExpenses = filteredExpenses.filter((expense: any) =>
            expense.copy_of_check
              ? expense.copy_of_check.name
                  .toLowerCase()
                  .includes(filterValue.toLowerCase())
              : false
          );
          break;
        case "status":
          filteredExpenses = filteredExpenses.filter(
            (expense: any) =>
              expense.status
                .toLowerCase()
                .includes(filterValue.toLowerCase())
          );
          break;
        default:
          break;
      }
    }

    if (sortBy !== "created_date") {
      try {
        filteredExpenses.sort((a: any, b: any) => {
          let compareValue = 0;
          switch (sortBy) {
            case "amount":
              compareValue = a.amount - b.amount;
              break;
            case "expense_type":
              compareValue = a.expense_type.localeCompare(b.expense_type);
              break;
            case "payee":
              compareValue =
                a.payee && b.payee
                  ? a.payee.full_name.localeCompare(b.payee.full_name)
                  : a.payee
                  ? -1
                  : b.payee
                  ? 1
                  : 0;
              break;
            case "type":
              compareValue = a.type.localeCompare(b.type);
              break;
            case "invoice_number":
              compareValue =
                a.invoice_number && b.invoice_number
                  ? a.invoice_number.localeCompare(b.invoice_number)
                  : a.invoice_number
                  ? -1
                  : b.invoice_number
                  ? 1
                  : 0;
              break;
            case "attachment":
              compareValue =
                a.attachment && b.attachment
                  ? a.attachment.name.localeCompare(b.attachment.name)
                  : a.attachment
                  ? -1
                  : b.attachment
                  ? 1
                  : 0;
              break;
            case "invoice_date":
              compareValue =
                a.invoice_date && b.invoice_date
                  ? a.invoice_date.localeCompare(b.invoice_date)
                  : a.invoice_date
                  ? -1
                  : b.invoice_date
                  ? 1
                  : 0;
              break;
            case "due_date":
              compareValue =
                a.due_date && b.due_date
                  ? a.due_date.localeCompare(b.due_date)
                  : a.due_date
                  ? -1
                  : b.due_date
                  ? 1
                  : 0;
              break;
            case "bill_no":
              compareValue =
                a.bill_no && b.bill_no
                  ? a.bill_no.localeCompare(b.bill_no)
                  : a.bill_no
                  ? -1
                  : b.bill_no
                  ? 1
                  : 0;
              break;
            case "description":
              compareValue = a.description.localeCompare(b.description);
              break;
            case "memo":
              break;
            case "notes":
              compareValue = a.notes.localeCompare(b.notes);
              break;
            case "create_in_quickbooks":
              compareValue = a.create_checking_quickbooks
                ? 1
                : b.create_checking_quickbooks
                ? -1
                : 0;
              break;
            case "create_billing_item":
              compareValue = a.create_billing_item
                ? 1
                : b.create_billing_item
                ? -1
                : 0;
              break;
            case "date_of_check":
              compareValue =
                a.date_of_check && b.date_of_check
                  ? a.date_of_check.localeCompare(b.date_of_check)
                  : a.date_of_check
                  ? -1
                  : b.date_of_check
                  ? 1
                  : 0;
              break;
            case "check_number":
              compareValue =
                a.check_number && b.check_number
                  ? a.check_number - b.check_number
                  : a.check_number
                  ? -1
                  : b.check_number
                  ? 1
                  : 0;
              break;
            case "last_update_from_quickbooks":
              compareValue =
                a.last_update_from_quickbooks && b.last_update_from_quickbooks
                  ? a.last_update_from_quickbooks.localeCompare(
                      b.last_update_from_quickbooks
                    )
                  : a.last_update_from_quickbooks
                  ? -1
                  : b.last_update_from_quickbooks
                  ? 1
                  : 0;
              break;
            case "status":
              compareValue = a.status.localeCompare(b.status);
              break;
            default:
              compareValue = a.created_at.localeCompare(b.created_at);
              break;
          }
          return compareValue * (sortDir === "asc" ? -1 : 1);
        });
      } catch (error: any) {
        console.error("sorting expenses error", error);
        return c.json({ error: error.message }, 500);
      }
    }

    const paginatedExpenses = filteredExpenses.slice(
      (page - 1) * limit,
      page * limit
    );

    return c.json(
      {
        data: paginatedExpenses,
        total: filteredExpenses.length,
        limit,
        page,
        totalAmount,
      },
      200
    );
  } catch (error: any) {
    console.error("getting expenses error", error);
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
  const copyOfCheck = body.get("copy_of_check") as File;
  const {
    expense_type_id,
    amount,
    payee_id,
    type,
    invoice_number,
    invoice_date,
    attachment_id,
    due_date,
    bill_no,
    copy_of_check_id,
    notify_admin_of_check_payment,
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

    const { data: expenseType, error: expenseTypeError } = await supabase
      .schema(schema)
      .from("expense_types")
      .select("*")
      .eq("id", expense_type_id)
      .single();

    if (expenseTypeError) {
      return c.json({ error: expenseTypeError.message }, 500);
    }

    if (expenseType.name !== "Soft Costs") {
      const { error: payeeError } = await supabase
        .schema(schema)
        .from("contacts")
        .select("*")
        .eq("id", payee_id)
        .single();

      if (payeeError) {
        return c.json({ error: payeeError.message }, 500);
      }
    }

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

    let attachmentId = "";
    if (attachment_id) {
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

    let dateOfCheck = null;
    let checkNumber = null;
    let copyOfCheckId = null;
    if (expenseType.name === "Check") {
      dateOfCheck = new Date().toISOString().split("T")[0];
      const { data: checkTypeData, error: checkTypeDataError } = await supabase
        .schema(schema)
        .from("case_expenses")
        .select("*")
        .eq("case_id", caseId)
        .eq("expense_type_id", expenseType.id);

      if (checkTypeDataError) {
        return c.json({ error: checkTypeDataError.message }, 500);
      }

      checkNumber = checkTypeData.length + 1;

      if (copy_of_check_id) {
        const { data: file, error: fileError } = await supabase
          .schema(schema)
          .from("storage_files")
          .update({
            folder_id: folder.id,
          })
          .eq("id", copy_of_check_id)
          .select()
          .single();

        if (fileError) {
          return c.json({ error: fileError.message }, 500);
        }

        copyOfCheckId = file.id;
      }
      if (copyOfCheck) {
        const gcsService = getGcsService();
        const buffer = await copyOfCheck.arrayBuffer();
        const fileData = new Uint8Array(buffer);
        const mimeType = copyOfCheck.type;
        const fileName = copyOfCheck.name;
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
        copyOfCheckId = fileRecord.id;
      }
    }

    const { data: expense, error: expenseError } = await supabase
      .schema(schema)
      .from("case_expenses")
      .insert({
        case_id: caseId,
        expense_type_id,
        amount: parseFloat(amount as string),
        payee_id: expenseType.name === "Soft Costs" ? null : payee_id,
        type,
        invoice_number,
        bill_no,
        attachment_id: attachmentId === "" ? null : attachmentId,
        invoice_date: invoice_date === "" ? null : invoice_date,
        due_date: due_date === "" ? null : due_date,
        description,
        memo,
        notes,
        date_of_check: dateOfCheck,
        check_number: checkNumber,
        copy_of_check_id: copyOfCheckId === "" ? null : copyOfCheckId,
        notify_admin_of_check_payment,
        create_checking_quickbooks: create_checking_quickbooks === "true",
        create_billing_item:
          create_billing_item === "unknown"
            ? null
            : create_billing_item === "true",
        last_update_from_quickbooks:
          last_update_from_quickbooks === ""
            ? null
            : last_update_from_quickbooks,
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

// Update expense
app.put("/expenses/cases/:caseId/:expenseId", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const caseId = c.req.param("caseId");
  const expenseId = c.req.param("expenseId");
  const body = await c.req.formData();
  const attachment = body.get("attachment") as File;
  const copyOfCheck = body.get("copy_of_check") as File;
  const {
    expense_type_id,
    amount,
    payee_id,
    type,
    invoice_number,
    invoice_date,
    attachment_id,
    due_date,
    bill_no,
    copy_of_check_id,
    notify_admin_of_check_payment,
    description,
    memo,
    notes,
    create_checking_quickbooks,
    create_billing_item,
    last_updated_from_quickbooks,
  } = Object.fromEntries(body.entries());

  try {
    const { supabase, schema, user, member } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    // Verify the expense exists and belongs to this case
    const { data: existingExpense, error: existingExpenseError } = await supabase
      .schema(schema)
      .from("case_expenses")
      .select("*")
      .eq("id", expenseId)
      .eq("case_id", caseId)
      .single();

    if (existingExpenseError || !existingExpense) {
      return c.json({ error: "Expense not found" }, 404);
    }

    const { data: expenseType, error: expenseTypeError } = await supabase
      .schema(schema)
      .from("expense_types")
      .select("*")
      .eq("id", expense_type_id)
      .single();

    if (expenseTypeError) {
      return c.json({ error: expenseTypeError.message }, 500);
    }

    if (expenseType.name !== "Soft Costs" && payee_id) {
      const { error: payeeError } = await supabase
        .schema(schema)
        .from("contacts")
        .select("*")
        .eq("id", payee_id)
        .single();

      if (payeeError) {
        return c.json({ error: payeeError.message }, 500);
      }
    }

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

    let attachmentId = existingExpense.attachment_id;
    
    // Handle attachment update
    if (attachment_id && attachment_id !== existingExpense.attachment_id) {
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

    let dateOfCheck = existingExpense.date_of_check;
    let checkNumber = existingExpense.check_number;
    let copyOfCheckIdValue = existingExpense.copy_of_check_id;
    
    // Handle Check-specific fields
    if (expenseType.name === "Check") {
      // Keep existing date and number unless we're changing from a different type
      if (existingExpense.expense_type_id !== expense_type_id) {
        dateOfCheck = new Date().toISOString().split("T")[0];
        const { data: checkTypeData, error: checkTypeDataError } = await supabase
          .schema(schema)
          .from("case_expenses")
          .select("*")
          .eq("case_id", caseId)
          .eq("expense_type_id", expenseType.id)
          .neq("id", expenseId); // Exclude current expense from count

        if (checkTypeDataError) {
          return c.json({ error: checkTypeDataError.message }, 500);
        }

        checkNumber = checkTypeData.length + 1;
      }

      if (copy_of_check_id && copy_of_check_id !== existingExpense.copy_of_check_id) {
        const { data: file, error: fileError } = await supabase
          .schema(schema)
          .from("storage_files")
          .update({
            folder_id: folder.id,
          })
          .eq("id", copy_of_check_id)
          .select()
          .single();

        if (fileError) {
          return c.json({ error: fileError.message }, 500);
        }

        copyOfCheckIdValue = file.id;
      }
      
      if (copyOfCheck) {
        const gcsService = getGcsService();
        const buffer = await copyOfCheck.arrayBuffer();
        const fileData = new Uint8Array(buffer);
        const mimeType = copyOfCheck.type;
        const fileName = copyOfCheck.name;

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
        copyOfCheckIdValue = fileRecord.id;
      }
    } else {
      // Clear check-specific fields if not a Check type
      dateOfCheck = null;
      checkNumber = null;
      copyOfCheckIdValue = null;
    }

    const { data: updatedExpense, error: updateError } = await supabase
      .schema(schema)
      .from("case_expenses")
      .update({
        expense_type_id,
        amount: parseFloat(amount as string),
        payee_id: expenseType.name === "Soft Costs" ? null : payee_id || null,
        type,
        invoice_number: invoice_number || null,
        bill_no: bill_no || null,
        attachment_id: attachmentId || null,
        invoice_date: invoice_date || null,
        due_date: due_date || null,
        description: description || null,
        memo: memo || null,
        notes: notes || null,
        date_of_check: dateOfCheck,
        check_number: checkNumber,
        copy_of_check_id: copyOfCheckIdValue || null,
        notify_admin_of_check_payment: notify_admin_of_check_payment || null,
        create_checking_quickbooks: create_checking_quickbooks === "true",
        create_billing_item:
          create_billing_item === "unknown"
            ? null
            : create_billing_item === "yes",
        last_updated_from_quickbooks:
          last_updated_from_quickbooks || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating expense:", updateError);
      return c.json({ error: updateError.message }, 500);
    }

    // Fetch related data for response
    if (updatedExpense.expense_type_id) {
      const { data: expenseTypeData } = await supabase
        .schema(schema)
        .from("expense_types")
        .select("name")
        .eq("id", updatedExpense.expense_type_id)
        .single();
      if (expenseTypeData) {
        updatedExpense.expense_type = expenseTypeData.name;
      }
    }

    if (updatedExpense.payee_id) {
      const { data: payee } = await supabase
        .schema(schema)
        .from("contacts")
        .select("id, full_name, emails, phones, addresses")
        .eq("id", updatedExpense.payee_id)
        .single();
      if (payee) {
        updatedExpense.payee = payee;
      }
    }

    if (updatedExpense.attachment_id) {
      const { data: attachmentData } = await supabase
        .schema(schema)
        .from("storage_files")
        .select("name")
        .eq("id", updatedExpense.attachment_id)
        .single();
      if (attachmentData) {
        updatedExpense.attachment = attachmentData;
      }
    }

    if (updatedExpense.copy_of_check_id) {
      const { data: copyOfCheckData } = await supabase
        .schema(schema)
        .from("storage_files")
        .select("name")
        .eq("id", updatedExpense.copy_of_check_id)
        .single();
      if (copyOfCheckData) {
        updatedExpense.copy_of_check = copyOfCheckData;
      }
    }

    return c.json({ data: updatedExpense }, 200);
  } catch (error: any) {
    console.error("updating expense error", error);
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
