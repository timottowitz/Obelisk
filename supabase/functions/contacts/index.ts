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

//get contact by search for case form
app.get("/contacts/search", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const { search } = c.req.query();
  const supabaseClient = await getSupabaseClinet();

  const org = await supabaseClient
    .schema("private")
    .from("organizations")
    .select("*")
    .eq("clerk_organization_id", orgId)
    .single();

  const user = await supabaseClient
    .schema("private")
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!user || !org) {
    return c.json({ error: "User or organization not found" }, 404);
  }

  const { data: contacts, error: contactsError } = await supabaseClient
    .schema(org.data?.schema_name.toLowerCase())
    .from("contacts")
    .select("*")
    .or(`full_name.ilike.%${search}%`);

  if (contactsError) {
    return c.json({ error: contactsError.message }, 500);
  }

  return c.json(contacts, 200);
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

    const contacts = await getContacts(
      supabaseClient,
      org.data?.schema_name.toLowerCase(),
      url
    );
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

//Create a new contact type
app.post("/contacts/types", async (c) => {
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

    const { data: contactType, error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .insert({ name: body.get("name") })
      .select();

    if (contactTypeError) {
      throw new Error(contactTypeError.message);
    }

    return c.json(contactType, 201);
  } catch (error: any) {
    console.error("creating contact type error", error);
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

//Archive a contact

app.put("/contacts/:contactId/archive", async (c) => {
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

    const { data: contact, error: contactError } = await supabaseClient
      .schema("public")
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (contactError) {
      throw new Error(contactError.message);
    }

    const { error: updateError } = await supabaseClient
      .schema("public")
      .from("contacts")
      .update({ is_archived: !contact.is_archived })
      .eq("id", contactId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return c.json({ message: "Contact archived successfully" }, 200);
  } catch (error: any) {
    console.error("archiving contact error", error);
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

async function getContacts(supabaseClient: any, schema: string, url: any) {
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "10");
  const sortBy = url.searchParams.get("sortBy") ?? "sort_by_first";
  const typeFilter = url.searchParams.get("typeFilter") ?? "all";
  const archived = url.searchParams.get("archived") ?? "false";

  let query = supabaseClient
    .schema(schema)
    .from("contacts")
    .select("*", { count: "exact" });

  if (search) query = query.or(`full_name.ilike.%${search}%`);
  if (typeFilter !== "all") {
    const { data: contactType, error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .select("*")
      .eq("name", typeFilter)
      .single();

    if (contactTypeError) {
      throw new Error(contactTypeError.message);
    }
    query = query.contains("contact_type_ids", [contactType.id]);
  }
  if (sortBy) query = query.order(sortBy, { ascending: true });
  if (archived) query = query.eq("is_archived", archived === "true");
  if (page && limit) query = query.range(limit * (page - 1), limit * page - 1);

  const { data: contacts, error: contactsError, count } = await query;

  if (contactsError) {
    throw new Error(contactsError.message);
  }

  for (const contact of contacts) {
    const contactTypes: string[] = [];
    for (const contactTypeId of contact.contact_type_ids) {
      const { data: contactType, error: contactTypeError } =
        await supabaseClient
          .schema("public")
          .from("contact_types")
          .select("*")
          .eq("id", contactTypeId)
          .single();

      if (contactTypeError) {
        throw new Error(contactTypeError.message);
      }

      contactTypes.push(contactType.name);
    }

    contact.contact_type = contactTypes;
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
    first_name,
    middle_name,
    last_name,
    suffix,
    prefix,
    company,
    department,
    job_title,
    phone,
    email,
    address,
    contact_type_ids,
    tags,
  } = Object.fromEntries(body);

  for (const id of JSON.parse(contact_type_ids)) {
    const { error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .select("*")
      .eq("id", id)
      .single();

    if (contactTypeError) {
      throw new Error("Contact type not found");
    }
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

  const fullName = [first_name, middle_name, last_name]
    .filter(Boolean)
    .join(" ");

  const phoneArray = phone ? JSON.parse(phone) : [];
  const emailArray = email ? JSON.parse(email) : [];
  const addressArray = address ? JSON.parse(address) : [];
  const contactTypeIds = JSON.parse(contact_type_ids);

  const { data: contact, error: contactError } = await supabaseClient
    .schema(org.data?.schema_name.toLowerCase())
    .from("contacts")
    .insert({
      first_name,
      middle_name,
      last_name,
      full_name: fullName,
      suffix,
      prefix,
      company,
      department,
      job_title,
      phones: phoneArray,
      emails: emailArray,
      addresses: addressArray,
      contact_type_ids: contactTypeIds,
      tags,
      picture_url: avatar_storage_url,
    })
    .select();

  if (contactError) {
    console.error("creating contact error", contactError);
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
    first_name,
    middle_name,
    last_name,
    suffix,
    prefix,
    company,
    department,
    job_title,
    phone,
    email,
    address,
    contact_type_ids,
    tags,
  } = Object.fromEntries(body);

  for (const id of JSON.parse(contact_type_ids)) {
    const { error: contactTypeError } = await supabaseClient
      .schema("public")
      .from("contact_types")
      .select("*")
      .eq("id", id)
      .single();

    if (contactTypeError) {
      throw new Error("Contact type not found");
    }
  }

  const fullName = [first_name, middle_name, last_name]
    .filter(Boolean)
    .join(" ");

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
  const contactTypeIds = JSON.parse(contact_type_ids);
  const { data: updatedContact, error: updatedContactError } =
    await supabaseClient
      .schema(org.data?.schema_name.toLowerCase())
      .from("contacts")
      .update({
        first_name,
        middle_name,
        last_name,
        full_name: fullName,
        suffix,
        prefix,
        company,
        department,
        job_title,
        phones: phoneArray,
        emails: emailArray,
        addresses: addressArray,
        contact_type_ids: contactTypeIds,
        tags,
        picture_url: avatar_storage_url,
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

    const { error: deletedContactError } = await supabaseClient
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

    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(`${tenantId}/${userId}/${fileName}`, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrl, error: publicUrlError } =
      await supabaseClient.storage
        .from("avatars")
        .getPublicUrl(`${tenantId}/${userId}/${fileName}`);

    if (publicUrlError) {
      throw new Error(publicUrlError.message);
    }

    return publicUrl.publicUrl;
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
