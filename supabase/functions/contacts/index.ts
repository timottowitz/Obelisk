// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { AzureBlobStorageService } from "../_shared/azure-storage.ts";

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

app.use("*", extractUserAndOrgId);

app.options("*", (c) => {
  return c.text("", 200);
});

//get supabase client
async function getSupabaseClinet() {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    }
  );
  return supabaseClient;
}

//get contact types
app.get("/contacts/types", async (c) => {
  try {
    const supabaseClient = await getSupabaseClinet();
    const contactTypes = await getContactTypes(supabaseClient);
    return c.json(contactTypes, 200);
  } catch (error: any) {
    console.error("getting contact types error", error);
    return c.json({ error: error.message }, 500);
  }
});

//get all contacts
app.get("/contacts", async (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  const url = new URL(c.req.url);

  if (!userId || !orgId) {
    return c.json({ error: "Missing userId or orgId" }, 400);
  }

  try {
    const supabaseClient = await getSupabaseClinet();
    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!user || !org) {
      return c.json({ error: "User or organization not found" }, 404);
    }

    const contacts = await getContacts(supabaseClient, org, url);
    return c.json(contacts, 200);
  } catch (error: any) {
    console.error("getting contacts error", error);
    return c.json({ error: error.message }, 500);
  }
});

//get signed url for avatar
app.get("/contacts/avatars/:contactId", async (c) => {
  const { contactId } = c.req.param();
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseClient = await getSupabaseClinet();
    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!user || !org) {
      return c.json({ error: "User or organization not found" }, 404);
    }

    const { data: contact, error: contactError } = await supabaseClient
      .schema(org.data?.schema_name.toLowerCase())
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (contactError) {
      return c.json({ error: contactError.message }, 500);
    }

    const avatarPath = contact.avatar_storage_url;

    const signedUrl = await supabaseClient.storage
      .from("avatars")
      .createSignedUrl(avatarPath.split("/").slice(1).join("/"), 60 * 60 * 24);

    return c.json({ signedUrl }, 200);
  } catch (error: any) {
    console.error("getting signed url error", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create a new contact
app.post("/contacts", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const body = await c.req.formData();

  try {
    const supabaseClient = await getSupabaseClinet();
    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!user || !org) {
      return c.json({ error: "User or organization not found" }, 404);
    }

    const contact = await createContact(body, supabaseClient, org, userId);
    return c.json(contact, 201);
  } catch (error: any) {
    console.error("creating contact error", error);
    return c.json({ error: error.message }, 500);
  }
});

//Update a contact
app.put("/contacts/:contactId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const body = await c.req.formData();
  const { contactId } = c.req.param();

  try {
    const supabaseClient = await getSupabaseClinet();
    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!user || !org) {
      return c.json({ error: "User or organization not found" }, 404);
    }

    const contact = await updateContact(
      body,
      supabaseClient,
      org,
      contactId,
      userId
    );
    return c.json(contact, 200);
  } catch (error: any) {
    console.error("updating contact error", error);
    return c.json({ error: error.message }, 500);
  }
});

//Delete a contact
app.delete("/contacts/:contactId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const { contactId } = c.req.param();

  try {
    const supabaseClient = await getSupabaseClinet();
    const user = await supabaseClient
      .schema("private")
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    const org = await supabaseClient
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();

    if (!user || !org) {
      return c.json({ error: "User or organization not found" }, 404);
    }

    await deleteContact(supabaseClient, org, contactId);
    return c.json({ message: "Contact deleted successfully" }, 200);
  } catch (error: any) {
    console.error("deleting contact error", error);
    return c.json({ error: error.message }, 500);
  }
});

async function getContacts(supabaseClient: any, org: any, url: any) {
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "5");
  const sortBy = url.searchParams.get("sortBy") ?? "asc";
  const typeFilter = url.searchParams.get("typeFilter") ?? "all";
  const archived = url.searchParams.get("archived") ?? "false";

  let query = supabaseClient
    .schema(org.data?.schema_name.toLowerCase())
    .from("contacts")
    .select("*", { count: "exact" });

  if (search) query = query.or(`name.ilike.%${search}%`);
  if (typeFilter !== "all") {
    const { data: contactType, error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .select("*")
      .eq("name", typeFilter.toLowerCase())
      .single();

    if (contactTypeError) {
      throw new Error(contactTypeError.message);
    }
    query = query.eq("contact_type_id", contactType.id);
  }
  if (sortBy) query = query.order("name", { ascending: sortBy === "asc" });
  if (archived) query = query.eq("archived", archived === "true");
  if (page && limit) query = query.range(limit * (page - 1), limit * page - 1);

  const { data: contacts, error: contactsError, count } = await query;

  if (contactsError) {
    throw new Error(contactsError.message);
  }

  for (const contact of contacts) {
    const { data: contactType, error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .select("*")
      .eq("id", contact.contact_type_id)
      .single();

    if (contactTypeError) {
      throw new Error(contactTypeError.message);
    }

    contact.contact_type = contactType.name;
  }

  return { data: contacts, count };
}

async function createContact(
  body: any,
  supabaseClient: any,
  org: any,
  userId: any
) {
  const avatar = body.get("avatar") as File;

  const {
    name,
    suffix,
    prefix,
    nickname,
    company,
    department,
    job_title,
    phone,
    email,
    address,
    contact_type_id,
    tags,
  } = Object.fromEntries(body);

  const { error: contactTypeError } = await supabaseClient
    .schema("public")
    .from("contact_types")
    .select("*")
    .eq("id", contact_type_id)
    .single();

  if (contactTypeError) {
    throw new Error("Contact type not found");
  }

  let avatar_storage_url = null;

  if (avatar) {
    const fileName = avatar.name;
    avatar_storage_url = await uploadAvatar(supabaseClient, {
      userId,
      fileName,
      file: avatar,
      tenantId: org.data?.id,
    });
  }

  const phoneArray = phone ? JSON.parse(phone) : [];
  const emailArray = email ? JSON.parse(email) : [];
  const addressArray = address ? JSON.parse(address) : [];

  const { data: contact, error: contactError } = await supabaseClient
    .schema(org.data?.schema_name.toLowerCase())
    .from("contacts")
    .insert({
      name,
      suffix,
      prefix,
      nickname,
      company,
      department,
      job_title,
      phone: phoneArray,
      email: emailArray,
      address: addressArray,
      contact_type_id,
      tags,
      avatar_storage_url,
    })
    .select();

  if (contactError) {
    throw new Error(contactError.message);
  }

  return contact;
}

async function updateContact(
  body: any,
  supabaseClient: any,
  org: any,
  contactId: any,
  userId: any
) {
  const avatar = body.get("avatar") as File;

  const {
    name,
    suffix,
    prefix,
    nickname,
    company,
    department,
    job_title,
    phone,
    email,
    address,
    contact_type_id,
    tags,
  } = Object.fromEntries(body);

  if (contact_type_id) {
    const { error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .select("*")
      .eq("id", contact_type_id)
      .single();

    if (contactTypeError) {
      throw new Error("Contact type not found");
    }
  }

  const contact = await supabaseClient
    .schema(org.data?.schema_name.toLowerCase())
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  let avatar_storage_url = contact.avatar_storage_url;

  if (avatar) {
    const fileName = avatar.name;
    if (contact.avatar_storage_url) {
      const path = contact.avatar_storage_url.split("/").slice(1).join("/");
      const oldFileName = contact.avatar_storage_url.split("/").pop();
      await supabaseClient.storage.from("avatars").remove([path, oldFileName]);
    }
    avatar_storage_url = await uploadAvatar(supabaseClient, {
      userId,
      fileName,
      file: avatar,
      tenantId: org.data?.id,
    });
  }

  const phoneArray = phone ? JSON.parse(phone) : [];
  const emailArray = email ? JSON.parse(email) : [];
  const addressArray = address ? JSON.parse(address) : [];

  const { data: updatedContact, error: updatedContactError } =
    await supabaseClient
      .schema(org.data?.schema_name.toLowerCase())
      .from("contacts")
      .update({
        name,
        suffix,
        prefix,
        nickname,
        company,
        department,
        job_title,
        phone: phoneArray,
        email: emailArray,
        address: addressArray,
        contact_type_id,
        tags,
        avatar_storage_url,
      })
      .eq("id", contactId)
      .select();

  if (updatedContactError) {
    throw new Error(updatedContactError.message);
  }

  return updatedContact;
}

async function deleteContact(supabaseClient: any, org: any, contactId: any) {
  try {
    const { data: contact, error: contactError } = await supabaseClient
      .schema(org.data?.schema_name.toLowerCase())
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (!contact) {
      throw new Error("Contact not found");
    }
    if (contactError) {
      throw new Error(contactError.message);
    }
    if (contact.avatar_storage_url) {
      const path = contact.avatar_storage_url.split("/").slice(1).join("/");
      const fileName = contact.avatar_storage_url.split("/").pop();
      await supabaseClient.storage.from("avatars").remove([path, fileName]);
    }

    const { data: deletedContact, error: deletedContactError } =
      await supabaseClient
        .schema(org.data?.schema_name.toLowerCase())
        .from("contacts")
        .delete()
        .eq("id", contactId);

    if (deletedContactError) {
      throw new Error(deletedContactError.message);
    }

    return "successfully deleted contact";
  } catch (error: any) {
    console.error("deleting contact error", error);
    throw new Error(error.message);
  }
}

async function uploadAvatar(
  supabaseClient: any,
  params: {
    userId: string;
    fileName: string;
    file: File;
    tenantId: string;
  }
) {
  const { userId, fileName, file, tenantId } = params;

  try {
    const { data, error } = await supabaseClient.storage.getBucket("avatars");

    if (error) {
      await supabaseClient.storage.createBucket("avatars", {
        public: false,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg"],
        fileSizeLimit: 1024 * 1024 * 5, // 5MB
      });
    }

    const { data: uploadData, error: uploadError } =
      await supabaseClient.storage
        .from("avatars")
        .upload(`${tenantId}/${userId}/${fileName}`, file, {
          cacheControl: "3600",
          upsert: true,
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    return uploadData.fullPath;
  } catch (error: any) {
    console.error("uploading avatar error", error);
    throw new Error(error.message);
  }
}

async function getContactTypes(supabaseClient: any) {
  const { data: contactType, error: contactTypeError } = await supabaseClient
    .schema("public")
    .from("contact_types")
    .select("*");

  if (contactTypeError) {
    throw new Error(contactTypeError.message);
  }

  return contactType;
}

// Export the Hono app for Supabase Edge Functions
export default app;
