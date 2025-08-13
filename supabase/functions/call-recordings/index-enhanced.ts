// Enhanced Call Recordings API with Meeting Intelligence
// Extends existing functionality to support meeting intelligence using ONLY Vertex AI Gemini
// Maintains full backward compatibility with legal SaaS features

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";
import {
  createEnhancedProcessor,
  EnhancedProcessingOptions,
} from "./enhanced-processing.ts";

const app = new Hono();

// Helper to format duration (unchanged)
function formatDuration(milliseconds: number): string {
  if (!milliseconds) return "0s";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}min`;
  } else {
    return `${seconds}s`;
  }
}

// Enhanced markdown report generator (supports both legal and meeting formats)
function generateEnhancedMarkdownReport(
  recording: any,
  transcript: string,
  analysis: any
): string {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const recordingType = recording.meeting_type || "call";
  const isLegalRecording =
    recordingType === "call" || recordingType === "consultation";

  const baseReport = `# ${
    isLegalRecording ? "Legal Call" : "Meeting"
  } Analysis Report

## Recording Details
- **Title**: ${recording.title}
- **Type**: ${recordingType.charAt(0).toUpperCase() + recordingType.slice(1)}
- **Date**: ${formatDate(recording.start_time)}
- **Duration**: ${formatDuration(recording.duration)}
${
  recording.participant_count
    ? `- **Participants**: ${recording.participant_count}`
    : ""
}

## 📄 Executive Summary
${analysis.summary || "Summary not available"}

## 🔑 Key Takeaways
${
  analysis.keyTakeaways?.length > 0
    ? analysis.keyTakeaways
        .map((takeaway: string, i: number) => `${i + 1}. ${takeaway}`)
        .join("\n")
    : "No key takeaways identified"
}

## ✅ Action Items
${
  analysis.actionItems?.length > 0
    ? analysis.actionItems
        .map((item: any) => {
          const assignee =
            item.assignee || item.assigneeSpeakerLabel
              ? ` - Assigned to: ${item.assignee || item.assigneeSpeakerLabel}`
              : "";
          const dueDate = item.dueDate ? ` - Due: ${item.dueDate}` : "";
          const priority = item.priority ? ` - Priority: ${item.priority}` : "";
          return `- [ ] ${item.task || item}${assignee}${dueDate}${priority}`;
        })
        .join("\n")
    : "No action items identified"
}

## 🎯 Decisions Made
${
  analysis.decisions?.length > 0
    ? analysis.decisions
        .map((decision: any, i: number) => {
          const decisionText = decision.decision || decision;
          const maker =
            decision.decisionMaker || decision.decisionMakerSpeakerLabel;
          const context = decision.context;
          let entry = `${i + 1}. ${decisionText}`;
          if (maker) entry += `\n   - **Decision Maker**: ${maker}`;
          if (context) entry += `\n   - **Context**: ${context}`;
          return entry;
        })
        .join("\n\n")
    : "No decisions recorded"
}`;

  // Add legal-specific sections for legal recordings
  const legalSections = isLegalRecording
    ? `

## ⚠️ Risk Analysis
${
  analysis.risks?.length > 0
    ? analysis.risks
        .map((risk: any) => {
          return `### ${risk.risk || risk}
- **Severity**: ${risk.severity || "Medium"}
- **Mitigation**: ${risk.mitigation || "To be determined"}`;
        })
        .join("\n\n")
    : "No significant risks identified"
}

## 📋 Compliance Notes
${
  analysis.compliance?.length > 0
    ? analysis.compliance.map((note: string) => `- ${note}`).join("\n")
    : "No compliance notes"
}

## 📌 Follow-up Tasks
${
  analysis.followUp?.length > 0
    ? analysis.followUp.map((task: string) => `- [ ] ${task}`).join("\n")
    : "No follow-up tasks identified"
}`
    : "";

  // Add meeting-specific sections for meetings
  const meetingSections = !isLegalRecording
    ? `

## 👥 Participants
${
  analysis.participants?.length > 0
    ? analysis.participants
        .map((p: any) => {
          const talkTime = p.talkTimeSeconds
            ? ` (${Math.round(p.talkTimeSeconds / 60)}min talk time)`
            : "";
          return `- **${p.participantName || p.speakerLabel}**: ${
            p.role
          }${talkTime}`;
        })
        .join("\n")
    : "Participant details not available"
}

## 📊 Meeting Topics
${
  analysis.topics?.length > 0
    ? analysis.topics
        .map((topic: any) => {
          const importance = topic.importance
            ? ` (Importance: ${Math.round(topic.importance * 100)}%)`
            : "";
          const speakers =
            topic.speakers?.length > 0
              ? ` - Discussed by: ${topic.speakers.join(", ")}`
              : "";
          return `### ${topic.topic}${importance}\n${speakers}`;
        })
        .join("\n\n")
    : "Topics not identified"
}`
    : "";

  const commonSections = `

## 🏷️ Topics Discussed
${
  analysis.topics?.length > 0
    ? analysis.topics
        .map((topic: any) => `- ${topic.topic || topic}`)
        .join("\n")
    : "Topics not identified"
}

## 📝 Full Transcript

${transcript || "Transcript not available"}

---

*Generated by ${
    isLegalRecording ? "Call Caps AI Legal Analysis" : "Meeting Intelligence"
  } System*  
*Powered by Google Gemini AI*  
*Generated on: ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}*

${
  isLegalRecording
    ? "**Confidentiality Notice**: This document contains attorney-client privileged information and is strictly confidential."
    : "**Confidentiality Notice**: This meeting content is confidential and intended for authorized participants only."
}
`;

  return baseReport + legalSections + meetingSections + commonSections;
}

// Configure CORS (unchanged)
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id"],
    credentials: true,
  })
);

// Apply middleware (unchanged)
app.use("/call-recordings", extractUserAndOrgId);
app.use("/call-recordings/:id/process", extractUserAndOrgId);
app.use("/call-recordings/:id/video", extractUserAndOrgId);
app.use("/call-recordings/:id/share", extractUserAndOrgId);
app.use("/call-recordings/:id/shares", extractUserAndOrgId);
app.use("/call-recordings/upload", extractUserAndOrgId);
app.use("/call-recordings/organization-members", extractUserAndOrgId);
app.use("/call-recordings/meeting-types", extractUserAndOrgId);

// GET all recordings (enhanced to support meeting types)
app.get("/call-recordings", async (c) => {
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

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Parse query params for pagination, search, and filters
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const orderBy = url.searchParams.get("orderBy") || "start_time";
    const orderDirection = (url.searchParams.get("orderDirection") ||
      "desc") as "asc" | "desc";
    const search = url.searchParams.get("search") || undefined;
    const meetingType = url.searchParams.get("meetingType") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;

    // Enhanced query to include meeting intelligence data
    let query = supabase
      .schema(schema)
      .from("accessible_recordings")
      .select("*", { count: "exact" });

    if (meetingType && meetingType !== "all") {
      query = query.eq("meeting_type", meetingType);
    }
    if (search) {
      query = query.ilike("title", `%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (startDate) {
      query = query.gte("start_time", startDate);
    }
    if (endDate) {
      query = query.lte("start_time", endDate);
    }
    query = query.order(orderBy, { ascending: orderDirection === "asc" });
    query = query.range(offset, offset + limit - 1);

    const { data: recordings, error, count } = await query;
    if (error) {
      throw error;
    }

    // If no recordings, return early
    if (!recordings || recordings.length === 0) {
      return c.json({ recordings: [], total: 0, limit, offset });
    }

    // Get all recording IDs
    const recordingIds = recordings.map((r: any) => r.id);

    // Fetch related meeting_participants
    const { data: participants, error: participantsError } = await supabase
      .schema(schema)
      .from("meeting_participants")
      .select(
        "recording_id, participant_name, speaker_label, role, talk_time_seconds"
      )
      .in("recording_id", recordingIds);
    if (participantsError) throw participantsError;

    // Fetch related meeting_action_items
    const { data: actionItems, error: actionItemsError } = await supabase
      .schema(schema)
      .from("meeting_action_items")
      .select(
        "recording_id, task_description, assignee_speaker_label, priority, status, due_date"
      )
      .in("recording_id", recordingIds);
    if (actionItemsError) throw actionItemsError;

    // Fetch related meeting_decisions
    const { data: decisions, error: decisionsError } = await supabase
      .schema(schema)
      .from("meeting_decisions")
      .select(
        "recording_id, decision_text, decision_maker_speaker_label, impact_level"
      )
      .in("recording_id", recordingIds);
    if (decisionsError) throw decisionsError;

    // Merge related data into each recording
    const recordingsWithRelated = recordings.map((rec: any) => ({
      ...rec,
      meeting_participants: participants.filter(
        (p: any) => p.recording_id === rec.id
      ),
      meeting_action_items: actionItems.filter(
        (a: any) => a.recording_id === rec.id
      ),
      meeting_decisions: decisions.filter(
        (d: any) => d.recording_id === rec.id
      ),
    }));

    return c.json({
      recordings: recordingsWithRelated,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

app.get("/call-recordings/meeting-types", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and member
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();
    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Get meeting types for this member
    const { data: meetingTypes, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("*")
      .eq("member_id", member.data?.id)
      .eq("is_active", true)
      .order("display_name");

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ meetingTypes: meetingTypes || [] });
  } catch (error) {
    console.error("Error fetching meeting types:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /call-recordings/meeting-types - Create new meeting type
app.post("/call-recordings/meeting-types", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and member
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();
    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Parse request body
    const body = await c.req.json();
    const {
      name,
      display_name,
      description,
      system_prompt,
      output_format = "json",
    } = body;

    // Validate required fields
    if (!name || !display_name || !system_prompt) {
      return c.json(
        { error: "Missing required fields: name, display_name, system_prompt" },
        400
      );
    }

    // Validate name format (no spaces, lowercase, underscores allowed)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return c.json(
        {
          error:
            "Name must contain only lowercase letters, numbers, and underscores",
        },
        400
      );
    }

    // Check if name is unique for this member
    const { data: existingType } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("id")
      .eq("member_id", member.data?.id)
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (existingType) {
      return c.json({ error: "Meeting type name already exists" }, 400);
    }

    // Create meeting type
    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .insert({
        name,
        display_name,
        description,
        system_prompt,
        output_format,
        member_id: member.data?.id,
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ meetingType });
  } catch (error) {
    console.error("Error creating meeting type:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /call-recordings/meeting-types/:id - Get specific meeting type
app.get("/call-recordings/meeting-types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const meetingTypeId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and member
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();
    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Get specific meeting type
    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("*")
      .eq("id", meetingTypeId)
      .eq("member_id", member.data?.id)
      .eq("is_active", true)
      .single();

    if (error || !meetingType) {
      return c.json({ error: "Meeting type not found" }, 404);
    }

    return c.json({ meetingType });
  } catch (error) {
    console.error("Error fetching meeting type:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// PUT /call-recordings/meeting-types/:id - Update meeting type
app.put("/call-recordings/meeting-types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const meetingTypeId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and member
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();
    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Parse request body
    const body = await c.req.json();
    const {
      name,
      display_name,
      description,
      system_prompt,
      output_format,
      is_active,
    } = body;

    // If name is being updated, validate it
    if (name) {
      const nameRegex = /^[a-z0-9_]+$/;
      if (!nameRegex.test(name)) {
        return c.json(
          {
            error:
              "Name must contain only lowercase letters, numbers, and underscores",
          },
          400
        );
      }

      // Check if name is unique for this member (excluding current record)
      const { data: existingType } = await supabase
        .schema(schema)
        .from("meeting_types")
        .select("id")
        .eq("member_id", member.data?.id)
        .eq("name", name)
        .eq("is_active", true)
        .neq("id", meetingTypeId)
        .single();

      if (existingType) {
        return c.json({ error: "Meeting type name already exists" }, 400);
      }
    }

    // Update meeting type
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;
    if (output_format !== undefined) updateData.output_format = output_format;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: meetingType, error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .update(updateData)
      .eq("id", meetingTypeId)
      .eq("member_id", member.data?.id)
      .select()
      .single();

    if (error || !meetingType) {
      return c.json({ error: "Meeting type not found or update failed" }, 404);
    }

    return c.json({ meetingType });
  } catch (error) {
    console.error("Error updating meeting type:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// DELETE /call-recordings/meeting-types/:id - Delete meeting type (soft delete)
app.delete("/call-recordings/meeting-types/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const meetingTypeId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get organization and member
    const org = await supabase
      .schema("private")
      .from("organizations")
      .select("*")
      .eq("clerk_organization_id", orgId)
      .single();
    if (org.error) {
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Soft delete meeting type
    const { error } = await supabase
      .schema(schema)
      .from("meeting_types")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", meetingTypeId)
      .eq("member_id", member.data?.id);

    if (error) {
      return c.json({ error: "Meeting type not found or delete failed" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting type:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Enhanced POST process route - supports both legal and meeting intelligence
app.post("/call-recordings/:id/process", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const recordingId = c.req.param("id");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!googleApiKey) {
      return c.json(
        {
          error:
            "Google API key not configured. Please configure GOOGLE_API_KEY environment variable.",
        },
        400
      );
    }

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

    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Get the call recording to check if it exists and get meeting_type_id
    const { data: recordingData, error: recordingError } = await supabase
      .schema(schema)
      .from("call_recordings")
      .select("meeting_type_id, status")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recordingData) {
      return c.json({ error: "Recording not found" }, 404);
    }

    if (!recordingData.meeting_type_id) {
      return c.json(
        {
          error:
            "Recording does not have a meeting type assigned. Please update the recording with a meeting type before processing.",
        },
        400
      );
    }

    // Get meeting type details
    const { data: meetingTypeData, error: meetingTypeError } = await supabase
      .schema(schema)
      .from("meeting_types")
      .select("system_prompt, output_format, display_name")
      .eq("id", recordingData.meeting_type_id)
      .eq("is_active", true)
      .single();

    if (meetingTypeError || !meetingTypeData) {
      return c.json({ error: "Meeting type not found or inactive" }, 400);
    }

    const systemPrompt = meetingTypeData.system_prompt;
    const outputFormat = meetingTypeData.output_format;
    const meetingTypeName = meetingTypeData.display_name;

    // Use enhanced processor for meeting intelligence analysis
    const processor = createEnhancedProcessor(googleApiKey);
    const processingOptions: EnhancedProcessingOptions = {
      recordingId,
      taskType: "all", // Transcribe and analyze
      systemPrompt,
      outputFormat,
      schema,
      supabase,
      googleApiKey,
    };

    const result = await processor.processRecording(processingOptions);

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({
      success: true,
      message: `Enhanced ${meetingTypeName} processing completed`,
      processingTime: result.processingTime,
      features: {
        speakerDiarization: !!result.transcript,
        meetingIntelligence: !!result.analysis,
        meetingType: meetingTypeName,
      },
    });
  } catch (error) {
    console.error("Enhanced processing error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// All other existing routes remain unchanged...
// (GET single recording, video streaming, sharing, etc.)

// GET single recording with enhanced data
app.get("/call-recordings/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const recordingId = c.req.param("id");

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

    const schema = org.data.schema_name;

    // Enhanced query with meeting intelligence data
    const { data: recording, error } = await supabase
      .schema(schema)
      .from("accessible_recordings")
      .select(
        `
        *,
        meeting_participants (*),
        meeting_action_items (*),
        meeting_decisions (*),
        meeting_topics (*)
      `
      )
      .eq("id", recordingId)
      .single();

    if (error || !recording) {
      return c.json({ error: "Recording not found" }, 404);
    }

    // Enhanced response with meeting intelligence
    const enhancedRecording = {
      id: recording.id,
      title: recording.title,
      meetingType: recording.meeting_type || "call",
      participantCount: recording.participant_count,
      date: new Date(recording.start_time).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: new Date(recording.start_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      duration: formatDuration(recording.duration),
      status: recording.status,
      // Meeting intelligence data
      participants: recording.meeting_participants || [],
      actionItems: recording.meeting_action_items || [],
      decisions: recording.meeting_decisions || [],
      topics: recording.meeting_topics || [],
      // Enhanced transcript with speaker segments
      transcript: {
        fullText: recording.transcript_text,
        segments: recording.transcript_segments || [],
        speakers: recording.speakers_metadata || {},
        summary: recording.ai_summary,
        analysis: recording.ai_analysis,
        keyTopics: recording.key_topics || [],
        sentiment: recording.sentiment,
        wordCount: recording.word_count,
      },
      // Media URLs
      videoUrl: recording.gcs_video_url,
      // Access information
      accessType: recording.access_type,
      shareInfo:
        recording.access_type === "shared"
          ? {
              sharedBy: recording.shared_by_member_id,
              permission: recording.permission_level,
              expiresAt: recording.share_expires_at,
            }
          : null,
    };

    return c.json({ recording: enhancedRecording });
  } catch (error) {
    console.error("Error fetching recording:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Upload recording route
app.post("/call-recordings", async (c) => {
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
      console.log(org);
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Parse request body
    const body = await c.req.json();
    const {
      recordingBlob,
      mimeType,
      duration,
      startTime,
      endTime,
      title,
      participants,
      meetingTypeId,
    } = body;

    if (!recordingBlob || !mimeType || !duration || !startTime || !title) {
      return c.json(
        {
          error:
            "Missing required fields: recordingBlob, mimeType, duration, startTime, title",
        },
        400
      );
    }

    // Validate meeting type if provided
    if (meetingTypeId) {
      const { data: meetingType, error: meetingTypeError } = await supabase
        .schema(schema)
        .from("meeting_types")
        .select("id, display_name")
        .eq("id", meetingTypeId)
        .eq("member_id", member.data?.id)
        .eq("is_active", true)
        .single();

      if (meetingTypeError || !meetingType) {
        return c.json(
          { error: "Invalid meeting type or meeting type not found" },
          400
        );
      }
    }

    const recordingsTable = `call_recordings`;
    const queueTable = `processing_queue`;

    // Create recording record in database
    const { data: recording, error: insertError } = await supabase
      .schema(schema)
      .from(recordingsTable)
      .insert({
        member_id: member.data?.id,
        title,
        start_time: startTime,
        end_time: endTime,
        duration,
        participants: participants || [],
        mime_type: mimeType,
        status: "uploading",
        has_video: true,
        has_audio: true,
        meeting_type_id: meetingTypeId || null,
      })
      .select()
      .single();

    if (insertError || !recording) {
      console.log("insertError", insertError);
      return c.json(
        { error: "Failed to create recording record", details: insertError },
        500
      );
    }

    try {
      // Initialize Azure Blob Storage
      const gcsService = getGcsService();

      // Convert base64 to ArrayBuffer
      const binaryString = atob(recordingBlob);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Azure Blob Storage
      const uploadResult = await gcsService.uploadVideo(
        user.data?.id,
        recording.id,
        bytes,
        mimeType
      );

      // Update recording with Azure URLs
      const { error: updateError } = await supabase
        .schema(schema)
        .from(recordingsTable)
        .update({
          gcs_video_url: uploadResult.blobUrl,
          gcs_video_blob_name: uploadResult.blobName,
          file_size: bytes.length,
          status: "uploaded",
        })
        .eq("id", recording.id);

      if (updateError) {
        console.error(
          "Failed to update recording with Azure URLs:",
          updateError
        );
      }

      // Add to processing queue for transcription
      const { error: queueError } = await supabase
        .schema(schema)
        .from(queueTable)
        .insert({
          recording_id: recording.id,
          task_type: "transcribe",
          status: "pending",
        });

      if (queueError) {
        console.error("Failed to add to processing queue:", queueError);
      }

      return c.json(
        {
          success: true,
          recording: {
            id: recording.id,
            title: recording.title,
            status: "uploaded",
            gcs_video_url: uploadResult.blobUrl,
            duration: recording.duration,
            start_time: recording.start_time,
            end_time: recording.end_time,
          },
        },
        200
      );
    } catch (uploadError: any) {
      console.log("uploadError", uploadError);
      // Update recording status to failed
      await supabase
        .schema(schema)
        .from(recordingsTable)
        .update({
          status: "failed",
          processing_error: uploadError.message,
        })
        .eq("id", recording.id);

      return c.json(
        { error: "Failed to upload to Azure", details: uploadError.message },
        500
      );
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Upload recording route with multipart form data
app.post("/call-recordings/upload", async (c) => {
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
      console.log(org);
      return c.json({ error: "Organization not found" }, 404);
    }
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const metadataString = formData.get("metadata") as string;

    if (!file || !metadataString) {
      return c.json(
        {
          error: "Missing required fields: file and metadata",
        },
        400
      );
    }

    let metadata;
    try {
      metadata = JSON.parse(metadataString);
    } catch (parseError) {
      return c.json(
        {
          error: "Invalid metadata JSON format",
        },
        400
      );
    }

    const {
      mimeType,
      duration,
      startTime,
      endTime,
      title,
      participants,
      meetingTypeId,
    } = metadata;

    if (!mimeType || !duration || !startTime || !title) {
      return c.json(
        {
          error:
            "Missing required metadata fields: mimeType, duration, startTime, title",
        },
        400
      );
    }

    console.log("Received file:", file.name, "with metadata:", metadata);

    // Validate meeting type if provided
    if (meetingTypeId) {
      const { data: meetingType, error: meetingTypeError } = await supabase
        .schema(schema)
        .from("meeting_types")
        .select("id, display_name")
        .eq("id", meetingTypeId)
        .eq("member_id", member.data?.id)
        .eq("is_active", true)
        .single();

      if (meetingTypeError || !meetingType) {
        return c.json(
          { error: "Invalid meeting type or meeting type not found" },
          400
        );
      }
    }

    const recordingsTable = `call_recordings`;
    const settingsTable = `user_settings`;
    const queueTable = `processing_queue`;

    // Create recording record in database
    const { data: recording, error: insertError } = await supabase
      .schema(schema)
      .from(recordingsTable)
      .insert({
        member_id: member.data?.id,
        title,
        start_time: startTime,
        end_time: endTime,
        duration,
        participants: participants || [],
        mime_type: mimeType,
        status: "uploading",
        has_video: true,
        has_audio: true,
        meeting_type_id: meetingTypeId || null,
      })
      .select()
      .single();

    if (insertError || !recording) {
      console.log("insertError", insertError);
      return c.json(
        { error: "Failed to create recording record", details: insertError },
        500
      );
    }

    try {
      // Initialize Azure Blob Storage
      const gcsService = getGcsService();

      // Convert File to ArrayBuffer
      const fileArrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(fileArrayBuffer);

      // Upload to Azure Blob Storage
      const uploadResult = await gcsService.uploadVideo(
        user.data?.id,
        recording.id,
        bytes,
        mimeType
      );

      // Update recording with Azure URLs
      const { error: updateError } = await supabase
        .schema(schema)
        .from(recordingsTable)
        .update({
          gcs_video_url: uploadResult.blobUrl,
          gcs_video_blob_name: uploadResult.blobName,
          file_size: bytes.length,
          status: "uploaded",
        })
        .eq("id", recording.id);

      if (updateError) {
        console.error(
          "Failed to update recording with Azure URLs:",
          updateError
        );
      }

      // Add to processing queue for transcription
      const { error: queueError } = await supabase
        .schema(schema)
        .from(queueTable)
        .insert({
          recording_id: recording.id,
          task_type: "transcribe",
          status: "pending",
        });

      if (queueError) {
        console.error("Failed to add to processing queue:", queueError);
      }

      return c.json(
        {
          success: true,
          recording: {
            id: recording.id,
            title: recording.title,
            status: "uploaded",
            gcs_video_url: uploadResult.blobUrl,
            duration: recording.duration,
            start_time: recording.start_time,
            end_time: recording.end_time,
          },
        },
        200
      );
    } catch (uploadError: any) {
      console.log("uploadError", uploadError);
      // Update recording status to failed
      await supabase
        .schema(schema)
        .from(recordingsTable)
        .update({
          status: "failed",
          processing_error: uploadError.message,
        })
        .eq("id", recording.id);

      return c.json(
        { error: "Failed to upload to Azure", details: uploadError.message },
        500
      );
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/call-recordings/:id/video", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const recordingId = c.req.param("id");

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
    const schema = org.data?.schema_name.toLowerCase();
    if (!schema) {
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

    // Get recording details (including shared recordings)
    const { data: recording, error: recordingError } = await supabase
      .schema(schema)
      .from("accessible_recordings")
      .select("*")
      .eq("id", recordingId)
      .or(`member_id.eq.${member.data?.id}`)
      .single();

    if (recordingError || !recording) {
      console.log("recordingError", recordingError);
      console.log("recording", recordingId, member.data?.id);
      return c.json({ error: "Recording not found" }, 404);
    }

    if (!recording.gcs_video_blob_name) {
      return c.json({ error: "Video file not found" }, 404);
    }

    const gcsService = getGcsService();

    // Download video from Azure
    const videoData = await gcsService.downloadBlob(
      recording.gcs_video_blob_name
    );

    // Return video with proper headers
    return new Response(videoData, {
      headers: {
        "Content-Type": recording.mime_type || "video/webm",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  } catch (error: any) {
    console.error("Video proxy error:", error);
    return c.json({ error: "Failed to load video" }, 500);
  }
});

function getGcsService() {
  const gcsKeyRaw = Deno.env.get("GCS_JSON_KEY");
  const bucketName = Deno.env.get("GCS_BUCKET_NAME");
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

// Keep all existing routes (upload, video streaming, sharing, etc.)
// ... (Include all other existing routes from the original file)

export default app;
