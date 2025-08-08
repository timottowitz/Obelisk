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
app.get("/tasks/cases/:caseId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");
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
      .eq("case_id", caseId)
      .range(limit * (page - 1), limit * page - 1);

    if (error) {
      return c.json({ "Failed to fetch tasks": error.message }, 500);
    }

    const caseDetailedTasks = [];
    for (const task of tasks) {
      const { data: assignee, error: assigneeError } = await supabase
        .schema("private")
        .from("users")
        .select("*")
        .eq("id", task.assignee_id)
        .single();

      if (assigneeError || !assignee) {
        return c.json(
          { "Failed to fetch assignee": assigneeError.message },
          500
        );
      }

      const { data: assigner, error: assignerError } = await supabase
        .schema("private")
        .from("users")
        .select("*")
        .eq("id", task.assigner_id)
        .single();

      if (assignerError || !assigner) {
        return c.json(
          { "Failed to fetch assigner": assignerError.message },
          500
        );
      }

      const { data: caseProject, error: caseProjectError } = await supabase
        .schema(schema)
        .from("case_projects")
        .select("*")
        .eq("id", task.case_project_id)
        .single();

      if (caseProjectError) {
        return c.json(
          { "Failed to fetch case project": caseProjectError.message },
          500
        );
      }

      caseDetailedTasks.push({
        ...task,
        assignee: assignee.email,
        assigner: assigner.email,
        case_project: caseProject.name,
      });
    }
    return c.json({
      data: caseDetailedTasks,
      count,
    });
  } catch (error: any) {
    return c.json({ "Failed to fetch tasks": error }, 500);
  }
});

//Get all projects
app.get("/tasks/projects", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("projects")
      .select("*");

    if (error) {
      return c.json({ "Failed to fetch projects": error.message }, 500);
    }

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ "Failed to fetch projects": error }, 500);
  }
});

//Create a project
app.post("/tasks/projects", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );

    const { name, description } = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("projects")
      .insert({ name, description, created_by_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error }, 500);
  }
});

// Get project tasks
app.get("/tasks/projects/:projectId/tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const projectId = c.req.param("projectId");
  const url = new URL(c.req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assignee_id = url.searchParams.get("assignee_id");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    let query = supabase
      .schema(schema)
      .from("case_tasks")
      .select(
        `
        *,
        assignee:private.users(*),
        category:task_categories(*)
      `
      )
      .eq("project_id", projectId);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (assignee_id) query = query.eq("assignee_id", assignee_id);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create project task
app.post("/tasks/projects/:projectId/tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const projectId = c.req.param("projectId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );
    const taskData = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .insert({
        ...taskData,
        project_id: projectId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get case projects
app.get("/tasks/cases/:caseId/projects", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data, error } = await supabase
      .schema(schema)
      .from("case_projects")
      .select("*")
      .eq("case_id", caseId);

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create case task
app.post("/tasks/cases/:caseId/tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );
    const taskData = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .insert({ ...taskData, case_id: caseId, assigner_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create case project
app.post("/tasks/cases/:caseId/projects", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");
  console.log("caseId", caseId);

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );
    const { name, description } = await c.req.json();
    console.log(user.id);

    const { data, error } = await supabase
      .schema(schema)
      .from("case_projects")
      .insert({
        name,
        description,
        case_id: caseId,
        created_by_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create case task from chat
app.post("/tasks/cases/:caseId/tasks/from-chat", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const caseId = c.req.param("caseId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );
    const taskData = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .insert({
        ...taskData,
        case_id: caseId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update task
app.put("/tasks/case-tasks/:taskId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const updates = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Update project task
app.put("/tasks/project-tasks/:taskId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const updates = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Complete/uncomplete case task
app.put("/tasks/case-tasks/:taskId/complete", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const { completed } = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Complete/uncomplete project task
app.put("/tasks/project-tasks/:taskId/complete", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);
    const { completed } = await c.req.json();

    const { data, error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete case task
app.delete("/tasks/case-tasks/:taskId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .delete()
      .eq("id", taskId);

    if (error) throw error;

    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete project task
app.delete("/tasks/project-tasks/:taskId", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const taskId = c.req.param("taskId");

  try {
    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    const { error } = await supabase
      .schema(schema)
      .from("case_tasks")
      .delete()
      .eq("id", taskId);

    if (error) throw error;

    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// AI foundation tasks processing
app.post("/tasks/ai/foundation-tasks", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, schema, user } = await getSupabaseAndOrgInfo(
      orgId,
      userId
    );
    const aiTaskData = await c.req.json();

    // Process AI task data and create tasks
    // This is a placeholder - implement actual AI processing logic
    const tasks = [];
    const insights: any[] = [];

    // Example: create tasks from AI suggestions
    for (const suggestion of aiTaskData.suggestions || []) {
      const { data: task, error } = await supabase
        .schema(schema)
        .from("case_tasks")
        .insert({
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority,
          due_date: suggestion.due_date,
          case_id: suggestion.case_id,
          project_id: suggestion.project_id,
          created_by: user.id,
          ai_generated: true,
        })
        .select()
        .single();

      if (!error && task) {
        tasks.push(task);
      }
    }

    return c.json({ tasks, insights }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("tasks/team-members", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const { supabase, org } = await getSupabaseAndOrgInfo(orgId, userId);

    const { data: members, error } = await supabase
      .schema("private")
      .from("organization_members")
      .select("*")
      .eq("organization_id", org.id);

    if (error) throw error;

    const data = [];
    for (const member of members) {
      const { data: user, error: userError } = await supabase
        .schema("private")
        .from("users")
        .select("*")
        .eq("id", member.user_id)
        .single();

      if (userError) throw userError;

      data.push({
        id: member.user_id,
        full_name: user.full_name,
        email: user.email,
        role: member.role,
      });
    }

    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
