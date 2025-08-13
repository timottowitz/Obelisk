// supabase/functions/ai-task-suggester/index.ts
import { createClient } from "jsr:@supabase/supabase-js";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { extractUserAndOrgId } from "../_shared/index.ts";
import OpenAI from "npm:openai";

const app = new Hono();

// Setup CORS
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", (c) => c.text("", 200));

// Add middleware
app.use("/ai-task-suggester", extractUserAndOrgId);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// Helper function to get Supabase client and organization info
// This is copied from the tasks function for now.
// A good refactor would be to move this to the _shared directory.
async function getSupabaseAndOrgInfo(orgId: string, userId: string) {
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
  if (org.error) throw new Error("Organization not found");

  const schema = org.data?.schema_name?.toLowerCase();
  if (!schema) throw new Error("Organization schema not found");

  // Optional: Verify user belongs to organization
  // For this suggester, we might not need to be as strict, but it's good practice.

  return { supabase, schema };
}


app.post("/ai-task-suggester", async (c) => {
  try {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const { case_id } = await c.req.json();

    if (!case_id) {
      return c.json({ error: "case_id is required" }, 400);
    }
    if (!orgId || !userId) {
      return c.json({ error: "User and Organization must be authenticated" }, 401);
    }

    const { supabase, schema } = await getSupabaseAndOrgInfo(orgId, userId);

    // Fetch the actual case data from the correct tenant schema
    const { data: caseData, error: caseError } = await supabase
      .schema(schema)
      .from("cases")
      .select("name, description, case_details")
      .eq("id", case_id)
      .single();

    if (caseError) {
      console.error("Error fetching case data:", caseError);
      return c.json({ error: "Case not found or you don't have access." }, 404);
    }

    // Construct a more detailed prompt
    const prompt = `
      Based on the following legal case details, please suggest 3 to 5 actionable tasks for a legal assistant or paralegal.
      For each task, provide a clear, concise name and a brief description.
      The tasks should be practical next steps to move the case forward.

      Case Name: ${caseData.name}
      Case Description: ${caseData.description}
      Case Details: ${JSON.stringify(caseData.case_details, null, 2)}

      Format your response as a JSON array of objects, where each object has a "name" and a "description" property.
      Example:
      [
        { "name": "Review and Summarize Contract", "description": "Thoroughly review the original contract and provide a one-page summary of key clauses, obligations, and deadlines." },
        { "name": "Draft Initial Discovery Requests", "description": "Prepare initial sets of interrogatories, requests for production of documents, and requests for admission to be sent to the defendant." }
      ]
    `;

    // For this implementation, we will continue to return a hardcoded list.
    // To enable the actual OpenAI call, you would need to set the OPENAI_API_KEY environment variable.
    const suggestions = [
        { "name": "Review and Summarize Contract", "description": "Thoroughly review the original contract and provide a one-page summary of key clauses, obligations, and deadlines." },
        { "name": "Draft Initial Discovery Requests", "description": "Prepare initial sets of interrogatories, requests for production of documents, and requests for admission to be sent to the defendant." },
        { "name": "Compile Witness List", "description": "Identify and create a preliminary list of potential witnesses based on the case description and initial documents." },
        { "name": "Create Case Timeline", "description": "Develop a detailed timeline of events leading up to the alleged breach of contract, citing key dates and correspondence." }
    ];

    // const response = await openai.chat.completions.create({
    //   model: "gpt-3.5-turbo",
    //   messages: [{ role: "user", content: prompt }],
    //   response_format: { type: "json_object" },
    // });
    // const suggestions = JSON.parse(response.choices[0].message.content || '[]');

    return c.json(suggestions, 200);

  } catch (err) {
    console.error("Error in AI task suggester:", err);
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve(app.fetch);
