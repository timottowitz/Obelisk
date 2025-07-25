/**
 * Meeting Intelligence API Extensions
 * Additional API endpoints specifically for meeting intelligence features
 * Extends the existing call-recordings API with meeting-specific functionality
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { extractUserAndOrgId } from "../_shared/index.ts";

const app = new Hono();

// Configure CORS
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-User-Id"],
    credentials: true,
  })
);

// Apply authentication middleware
app.use("*", extractUserAndOrgId);

/**
 * GET /meetings/analytics
 * Returns aggregated meeting analytics and statistics
 */
app.get("/meetings/analytics", async (c) => {
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

    const schema = org.data.schema_name;

    // Get meeting statistics
    const { data: meetingStats, error: statsError } = await supabase
      .schema(schema)
      .from("call_recordings")
      .select(
        `
        id,
        meeting_type,
        duration,
        participant_count,
        start_time,
        status,
        created_at
      `
      )
      .not("meeting_type", "is", null);

    if (statsError) {
      return c.json({ error: statsError.message }, 500);
    }

    // Get action items statistics
    const { data: actionItemStats } = await supabase
      .schema(schema)
      .from("meeting_action_items")
      .select("status, priority, created_at, recording_id");

    // Get participant statistics
    const { data: participantStats } = await supabase
      .schema(schema)
      .from("meeting_participants")
      .select("talk_time_seconds, role, recording_id");

    // Calculate analytics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalMeetings = meetingStats?.length || 0;
    const meetingsThisWeek =
      meetingStats?.filter((m) => new Date(m.start_time) >= weekAgo).length ||
      0;
    const meetingsThisMonth =
      meetingStats?.filter((m) => new Date(m.start_time) >= monthAgo).length ||
      0;

    const totalDuration =
      meetingStats?.reduce((sum, m) => sum + (m.duration || 0), 0) || 0;
    const avgDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0;
    const avgParticipants =
      totalMeetings > 0
        ? meetingStats.reduce((sum, m) => sum + (m.participant_count || 0), 0) /
          totalMeetings
        : 0;

    // Meeting type breakdown
    const meetingsByType =
      meetingStats?.reduce((acc: any, meeting) => {
        const type = meeting.meeting_type || "call";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};

    // Action item completion rate
    const totalActionItems = actionItemStats?.length || 0;
    const completedActionItems =
      actionItemStats?.filter((ai) => ai.status === "completed").length || 0;
    const completionRate =
      totalActionItems > 0
        ? (completedActionItems / totalActionItems) * 100
        : 0;

    // Processing success rate
    const completedMeetings =
      meetingStats?.filter((m) => m.status === "completed").length || 0;
    const processingSuccessRate =
      totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0;

    return c.json({
      summary: {
        totalMeetings,
        meetingsThisWeek,
        meetingsThisMonth,
        totalDurationMinutes: Math.round(totalDuration / (1000 * 60)),
        avgDurationMinutes: Math.round(avgDuration / (1000 * 60)),
        avgParticipants: Math.round(avgParticipants * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        processingSuccessRate: Math.round(processingSuccessRate * 10) / 10,
      },
      breakdowns: {
        meetingsByType,
        actionItemsByStatus:
          actionItemStats?.reduce((acc: any, ai) => {
            acc[ai.status] = (acc[ai.status] || 0) + 1;
            return acc;
          }, {}) || {},
        actionItemsByPriority:
          actionItemStats?.reduce((acc: any, ai) => {
            acc[ai.priority] = (acc[ai.priority] || 0) + 1;
            return acc;
          }, {}) || {},
      },
      trends: {
        weeklyMeetings: meetingsThisWeek,
        monthlyMeetings: meetingsThisMonth,
        weeklyDuration: Math.round(
          (meetingStats
            ?.filter((m) => new Date(m.start_time) >= weekAgo)
            .reduce((sum, m) => sum + (m.duration || 0), 0) || 0) /
            (1000 * 60)
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching meeting analytics:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

/**
 * GET /meetings/:id/participants
 * Returns detailed participant information for a meeting
 */
app.get("/meetings/:id/participants", async (c) => {
  const orgId = c.get("orgId");
  const meetingId = c.req.param("id");

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

    const { data: participants, error } = await supabase
      .schema(schema)
      .from("meeting_participants")
      .select("*")
      .eq("recording_id", meetingId)
      .order("talk_time_seconds", { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Calculate participation metrics
    const totalTalkTime =
      participants?.reduce((sum, p) => sum + (p.talk_time_seconds || 0), 0) ||
      0;

    const enhancedParticipants =
      participants?.map((p) => ({
        ...p,
        talkTimePercentage:
          totalTalkTime > 0
            ? Math.round((p.talk_time_seconds / totalTalkTime) * 100)
            : 0,
        talkTimeFormatted: formatDuration(p.talk_time_seconds * 1000),
      })) || [];

    return c.json({
      participants: enhancedParticipants,
      summary: {
        totalParticipants: participants?.length || 0,
        totalTalkTimeSeconds: totalTalkTime,
        avgTalkTimeSeconds:
          participants?.length > 0
            ? Math.round(totalTalkTime / participants.length)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

/**
 * GET /meetings/:id/action-items
 * Returns action items for a specific meeting
 */
app.get("/meetings/:id/action-items", async (c) => {
  const orgId = c.get("orgId");
  const meetingId = c.req.param("id");

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

    const { data: actionItems, error } = await supabase
      .schema(schema)
      .from("meeting_action_items")
      .select("*")
      .eq("recording_id", meetingId)
      .order("created_at", { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ actionItems: actionItems || [] });
  } catch (error) {
    console.error("Error fetching action items:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

/**
 * PUT /meetings/:id/action-items/:actionId
 * Updates an action item status
 */
app.put("/meetings/:id/action-items/:actionId", async (c) => {
  const orgId = c.get("orgId");
  const meetingId = c.req.param("id");
  const actionId = c.req.param("actionId");

  try {
    const body = await c.req.json();
    const { status, assignee, due_date, notes } = body;

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

    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignee) updateData.assignee_speaker_label = assignee;
    if (due_date) updateData.due_date = due_date;
    if (notes) updateData.notes = notes;

    // Add completion timestamp if marking as completed
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: actionItem, error } = await supabase
      .schema(schema)
      .from("meeting_action_items")
      .update(updateData)
      .eq("id", actionId)
      .eq("recording_id", meetingId)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ actionItem });
  } catch (error) {
    console.error("Error updating action item:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

/**
 * GET /meetings/:id/decisions
 * Returns decisions made in a specific meeting
 */
app.get("/meetings/:id/decisions", async (c) => {
  const orgId = c.get("orgId");
  const meetingId = c.req.param("id");

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

    const { data: decisions, error } = await supabase
      .schema(schema)
      .from("meeting_decisions")
      .select("*")
      .eq("recording_id", meetingId)
      .order("created_at", { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ decisions: decisions || [] });
  } catch (error) {
    console.error("Error fetching decisions:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

/**
 * GET /meetings/:id/topics
 * Returns topics discussed in a specific meeting
 */
app.get("/meetings/:id/topics", async (c) => {
  const orgId = c.get("orgId");
  const meetingId = c.req.param("id");

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

    const { data: topics, error } = await supabase
      .schema(schema)
      .from("meeting_topics")
      .select("*")
      .eq("recording_id", meetingId)
      .order("importance_score", { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ topics: topics || [] });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

/**
 * POST /meetings/:id/export
 * Exports meeting data in various formats
 */
app.post("/meetings/:id/export", async (c) => {
  const orgId = c.get("orgId");
  const meetingId = c.req.param("id");

  try {
    const body = await c.req.json();
    const {
      format = "json",
      includeTranscript = true,
      includeAnalysis = true,
    } = body;

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

    // Get complete meeting data
    const { data: meeting, error } = await supabase
      .schema(schema)
      .from("call_recordings")
      .select(
        `
        *,
        meeting_participants (*),
        meeting_action_items (*),
        meeting_decisions (*),
        meeting_topics (*)
      `
      )
      .eq("id", meetingId)
      .single();

    if (error || !meeting) {
      return c.json({ error: "Meeting not found" }, 404);
    }

    const exportData = {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        meetingType: meeting.meeting_type,
        startTime: meeting.start_time,
        duration: meeting.duration,
        participantCount: meeting.participant_count,
        status: meeting.status,
      },
      participants: meeting.meeting_participants || [],
      actionItems: meeting.meeting_action_items || [],
      decisions: meeting.meeting_decisions || [],
      topics: meeting.meeting_topics || [],
      transcript: meeting.transcript_text,
      analysis: meeting.ai_analysis,
      sentiment: meeting.sentiment,
      keyTopics: meeting.key_topics,
    };

    if (includeTranscript) {
      exportData.transcript = {
        text: meeting.transcript_text,
        segments: meeting.transcript_segments,
        speakers: meeting.speakers_metadata,
      };
    }

    if (includeAnalysis) {
      exportData.analysis = {
        summary: meeting.ai_summary,
        analysis: meeting.ai_analysis,
        sentiment: meeting.sentiment,
        keyTopics: meeting.key_topics,
      };
    }

    // Format response based on requested format
    if (format === "csv") {
      // For CSV, we'll return action items as the main export
      const csvData = (meeting.meeting_action_items || []).map((item: any) => ({
        Task: item.task_description,
        Assignee: item.assignee_speaker_label || "",
        Status: item.status,
        Priority: item.priority,
        "Due Date": item.due_date || "",
        "Created At": item.created_at,
      }));

      return c.json({
        format: "csv",
        data: csvData,
        filename: `meeting-${meetingId}-action-items.csv`,
      });
    }

    return c.json({
      format: "json",
      data: exportData,
      filename: `meeting-${meetingId}-export.json`,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error exporting meeting:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Helper function to format duration
function formatDuration(milliseconds: number): string {
  if (!milliseconds) return "0s";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export default app;
