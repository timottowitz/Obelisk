// Enhanced Meeting Intelligence Processing
// Extends existing call-recordings with meeting intelligence using ONLY Vertex AI Gemini

import { GoogleCloudStorageService } from "../_shared/google-storage.ts";
import {
  GeminiMeetingIntelligence,
  SpeakerSegment,
  MeetingAnalysisResult,
} from "./gemini-meeting-intelligence.ts";
import MeetingPromptLibrary from "./meeting-prompts.ts";

export interface EnhancedProcessingOptions {
  recordingId: string;
  taskType: "transcribe" | "analyze" | "all";
  systemPrompt?: string; // Custom system prompt from meeting type
  outputFormat?: string; // Output format from meeting type
  schema: string;
  supabase: any;
  googleApiKey: string;
  orgId: string;
  userId: string;
}

// Helper to find userId by name
async function findUserIdByName(
  supabase: any,
  orgId: string,
  name: string
): Promise<string | null> {
  if (!name) return null;

  const { data: users, error: usersError } = await supabase
    .schema("private")
    .from("users")
    .select("id")
    .eq("full_name", name);

  if (usersError) {
    throw usersError;
  }

  if (!users || users.length === 0) {
    return null;
  }

  if (users.length === 1) {
    return users[0].id;
  }

  const candidateIds = users.map((u: { id: string }) => u.id);

  const { data: memberships, error: membershipsError } = await supabase
    .schema("private")
    .from("organization_members")
    .select("user_id")
    .in("user_id", candidateIds)
    .eq("organization_id", orgId)
    .eq("status", "active");

  if (membershipsError) {
    throw membershipsError;
  }

  if (!memberships || memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return memberships[0].user_id;
  }

  return null;
}

// Helper to find case by identifier
async function findCaseByIdentifier(
  supabase: any,
  schema: string,
  identifier: string
): Promise<string | null> {
  if (!identifier) return null;

  const { data: caseData, error } = await supabase
    .schema(schema)
    .from("cases")
    .select("id")
    .or(`case_number.eq.${identifier},details->>title.ilike.%${identifier}%`)
    .maybeSingle();

  if (error) {
    console.error(`Error finding case by identifier "${identifier}":`, error);
    return null;
  }

  return caseData ? caseData.id : null;
}

// Helper to generate markdown report
function generateMarkdownReport(
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

  const formatDuration = (milliseconds: number) => {
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
  };

  return `# Legal Meeting Analysis Report

## 📋 Meeting Information
- **Meeting ID**: ${recording.id}
- **Title**: ${recording.title}
- **Date & Time**: ${formatDate(recording.start_time)}
- **Duration**: ${formatDuration(recording.duration)}
- **Participants**: ${recording.participants?.join(", ") || "Not specified"}

## 🎯 Executive Summary
${analysis.summary || "No summary available"}

## 📊 Meeting Metrics
- **Sentiment**: ${
    analysis.sentiment
      ? analysis.sentiment.charAt(0).toUpperCase() + analysis.sentiment.slice(1)
      : "N/A"
  }
- **Word Count**: ${recording.word_count || 0}
- **Action Items**: ${analysis.actionItems?.length || 0}
- **Decisions Made**: ${analysis.decisions?.length || 0}
- **Risk Items**: ${analysis.risks?.length || 0}

## 🔑 Key Points
${
  analysis.keyPoints?.length > 0
    ? analysis.keyPoints
        .map((point: string, i: number) => `${i + 1}. ${point}`)
        .join("\n")
    : "No key points identified"
}

## ✅ Action Items
${
  analysis.actionItems?.length > 0
    ? analysis.actionItems
        .map((item: any) => {
          const assignee = item.assignee
            ? ` - Assigned to: ${item.assignee}`
            : "";
          const dueDate = item.dueDate ? ` - Due: ${item.dueDate}` : "";
          return `- [ ] ${item.task || item}${assignee}${dueDate}`;
        })
        .join("\n")
    : "No action items identified"
}

## 🎯 Decisions Made
${
  analysis.decisions?.length > 0
    ? analysis.decisions
        .map((decision: string, i: number) => `${i + 1}. ${decision}`)
        .join("\n")
    : "No decisions recorded"
}

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
}

## 🏷️ Topics Discussed
${
  analysis.topics?.length > 0
    ? analysis.topics.map((topic: string) => `- ${topic}`).join("\n")
    : "Topics not identified"
}

## 📝 Full Transcript

${transcript || "Transcript not available"}

---

*Generated by Call Caps AI Legal Analysis System*  
*Powered by OpenAI Whisper & GPT-4*  
*Generated on: ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}*

**Confidentiality Notice**: This document contains attorney-client privileged information and is strictly confidential.
`;
}

export interface ProcessingResult {
  success: boolean;
  transcript?: {
    segments: SpeakerSegment[];
    fullText: string;
  };
  analysis?: MeetingAnalysisResult;
  error?: string;
  processingTime?: number;
}

export class EnhancedMeetingProcessor {
  private geminiAI: GeminiMeetingIntelligence;
  private gcsService: GoogleCloudStorageService;

  constructor(googleApiKey: string) {
    this.geminiAI = new GeminiMeetingIntelligence(googleApiKey);
    this.gcsService = getGcsService();
  }

  /**
   * Process meeting recording with enhanced intelligence
   * Maintains backward compatibility with existing legal recordings
   */
  async processRecording(
    options: EnhancedProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    console.log(
      `Starting enhanced processing for recording ${options.recordingId}`
    );

    try {
      // Get recording details
      const recording = await this.getRecordingDetails(options);
      if (!recording) {
        return { success: false, error: "Recording not found" };
      }

      let result: ProcessingResult = { success: true };

      // Step 1: Enhanced Transcription with Speaker Diarization
      if (options.taskType === "transcribe" || options.taskType === "all") {
        const transcriptResult = await this.processTranscription(
          recording,
          options
        );
        if (!transcriptResult.success) {
          return transcriptResult;
        }
        result.transcript = transcriptResult.transcript;
      }

      // Step 2: Meeting Intelligence Analysis (using existing transcript if available)
      if (options.taskType === "analyze" || options.taskType === "all") {
        const analysisResult = await this.processAnalysis(
          recording,
          options,
          result.transcript
        );
        if (!analysisResult.success) {
          return analysisResult;
        }
        result.analysis = analysisResult.analysis;
      }

      // Step 3: Save enhanced data to database
      await this.saveEnhancedData(options, result);

      result.processingTime = Date.now() - startTime;
      console.log(
        `Enhanced processing completed in ${result.processingTime}ms`
      );

      await this.saveMarkDownReport(
        recording,
        result.transcript,
        result.analysis,
        options.supabase,
        options.schema,
        options.userId
      );

      return result;
    } catch (error) {
      console.error("Enhanced processing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get recording details from database
   */
  private async getRecordingDetails(
    options: EnhancedProcessingOptions
  ): Promise<any> {
    console.log("options", options);
    const { data: recording, error } = await options.supabase
      .schema(options.schema)
      .from("call_recordings")
      .select("*")
      .eq("id", options.recordingId)
      .single();

    if (error) {
      console.error("Error getting recording:", error);
      return null;
    }

    return recording;
  }

  /**
   * Process transcription with enhanced speaker diarization
   */
  private async processTranscription(
    recording: any,
    options: EnhancedProcessingOptions
  ): Promise<{ success: boolean; transcript?: any; error?: string }> {
    console.log("Starting enhanced transcription with speaker diarization...");

    try {
      // Download video from Google Cloud Storage
      const videoBytes = await this.gcsService.downloadBlob(
        recording.gcs_video_blob_name
      );
      const videoBlob = new Blob([videoBytes], { type: recording.mime_type });

      // Use enhanced Gemini processing
      const transcriptionResult =
        await this.geminiAI.transcribeWithSpeakerDiarization(
          videoBlob,
          recording.mime_type,
          recording.gcs_video_blob_name,
          "meeting" // default type for transcription
        );

      console.log("transcriptionResult", transcriptionResult);

      // Update recording with transcript data
      const res = await options.supabase
        .schema(options.schema)
        .from("call_recordings")
        .update({
          transcript_text: transcriptionResult.fullTranscript,
          transcript_segments: transcriptionResult.segments,
          speakers_metadata: this.extractSpeakersMetadata(
            transcriptionResult.segments
          ),
          status:
            options.taskType === "transcribe" ? "completed" : "processing",
        })
        .eq("id", options.recordingId);

      console.log("res", res);

      // Save speaker segments to new participant table
      await this.saveParticipants(
        recording.id,
        transcriptionResult.segments,
        options
      );

      return {
        success: true,
        transcript: transcriptionResult,
      };
    } catch (error) {
      console.error("Transcription error:", error);

      // Update recording status to failed
      await options.supabase
        .schema(options.schema)
        .from("call_recordings")
        .update({
          status: "failed",
          processing_error:
            error instanceof Error ? error.message : String(error),
        })
        .eq("id", options.recordingId);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process meeting analysis using Gemini
   */
  private async processAnalysis(
    recording: any,
    options: EnhancedProcessingOptions,
    transcriptData?: any
  ): Promise<{
    success: boolean;
    analysis?: MeetingAnalysisResult;
    error?: string;
  }> {
    console.log("Starting meeting intelligence analysis...");

    try {
      // Get transcript (either from current processing or database)
      let transcript =
        transcriptData?.fullTranscript || recording.transcript_text;
      let segments =
        transcriptData?.segments || recording.transcript_segments || [];

      if (!transcript) {
        return {
          success: false,
          error: "No transcript available for analysis",
        };
      }

      // Use custom system prompt if provided, otherwise use default analysis
      let analysisResult;
      if (options.systemPrompt) {
        // Use custom system prompt from meeting type
        analysisResult = await this.geminiAI.analyzeWithCustomPrompt(
          transcript,
          segments,
          options.systemPrompt,
          options.outputFormat || "json"
        );
      } else {
        // Fallback to default meeting analysis
        analysisResult = await this.geminiAI.analyzeMeetingIntelligence(
          transcript,
          segments,
          "meeting" // default type
        );
      }

      console.log("analysisResult", analysisResult);

      const { actionItems, ...analysisToSave } = analysisResult;
      // Update recording with analysis results
      const updateData = {
        ai_analysis: analysisToSave,
        action_items: actionItems,
        ai_summary:
          analysisResult.summary ||
          (typeof analysisResult === "string"
            ? analysisResult
            : JSON.stringify(analysisResult)),
        key_topics: analysisResult.keyTakeaways || [],
        risk_analysis: analysisResult.risks || [],
        sentiment: analysisResult.sentiment || "neutral",
        status: "processed",
      };

      // if (specificAnalysis) {
      //   updateData.specific_analysis = specificAnalysis;
      // }

      const { error: updateError } = await options.supabase
        .schema(options.schema)
        .from("call_recordings")
        .update(updateData)
        .eq("id", options.recordingId);

      console.log("updateError", updateError);

      // Save structured data to meeting-specific tables
      await this.saveMeetingData(recording.id, analysisResult, options);

      return {
        success: true,
        analysis: analysisResult,
      };
    } catch (error) {
      console.error("Analysis error:", error);

      await options.supabase
        .schema(options.schema)
        .from("call_recordings")
        .update({
          status: "failed",
          processing_error:
            error instanceof Error ? error.message : String(error),
        })
        .eq("id", options.recordingId);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run specific analysis using meeting prompt templates
   */
  private async runSpecificAnalysis(
    transcript: string,
    analysisType: string,
    options: EnhancedProcessingOptions
  ): Promise<any> {
    const promptTemplate = MeetingPromptLibrary.getPrompt(analysisType);
    if (!promptTemplate) {
      console.warn(`Unknown analysis type: ${analysisType}`);
      return null;
    }

    const filledPrompt = MeetingPromptLibrary.fillTemplate(
      promptTemplate.template,
      {
        transcript,
        date: new Date().toISOString().split("T")[0],
        meetingType: "meeting", // default type
        duration: "45 minutes", // TODO: Calculate from recording
        generationDate: new Date().toLocaleString(),
      }
    );

    // Use Gemini for specific analysis
    const response = await this.geminiAI["genAI"].models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: filledPrompt }],
        },
      ],
    });

    const responseText = response.text; // TODO: Fix this

    try {
      if (promptTemplate.outputFormat === "json" && responseText) {
        // Remove code fences and language tags
        const cleanText = responseText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText || "{}");
      }
      return responseText;
    } catch (error) {
      console.error("Failed to parse specific analysis:", error, responseText);
      return responseText; // Return raw text if JSON parsing fails
    }
  }

  /**
   * Extract speakers metadata from segments
   */
  private extractSpeakersMetadata(segments: SpeakerSegment[]): any {
    const speakerMap = new Map();

    segments.forEach((segment) => {
      if (!speakerMap.has(segment.speaker)) {
        speakerMap.set(segment.speaker, {
          label: segment.speaker,
          utteranceCount: 0,
          totalWords: 0,
          estimatedTalkTime: 0,
        });
      }

      const speaker = speakerMap.get(segment.speaker);
      speaker.utteranceCount++;
      speaker.totalWords += segment.transcription.split(" ").length;
      speaker.estimatedTalkTime += segment.transcription.length / 10; // rough estimate
    });

    return {
      totalSpeakers: speakerMap.size,
      speakers: Array.from(speakerMap.values()),
    };
  }

  /**
   * Save participants to meeting_participants table
   */
  private async saveParticipants(
    recordingId: string,
    segments: SpeakerSegment[],
    options: EnhancedProcessingOptions
  ): Promise<void> {
    const speakerMap = new Map();

    segments.forEach((segment) => {
      if (!speakerMap.has(segment.speaker)) {
        speakerMap.set(segment.speaker, {
          recording_id: recordingId,
          participant_name: segment.speaker,
          speaker_label: segment.speaker,
          role: "participant",
          talk_time_seconds: 0,
        });
      }

      const participant = speakerMap.get(segment.speaker);
      participant.talk_time_seconds += Math.max(
        segment.transcription.length / 10,
        (segment.endTime || 0) - (segment.startTime || 0)
      );
    });

    const participants = Array.from(speakerMap.values());

    if (participants.length > 0) {
      await options.supabase
        .schema(options.schema)
        .from("meeting_participants")
        .insert(participants);
    }
  }

  /**
   * Save meeting analysis data to structured tables
   */
  private async saveMeetingData(
    recordingId: string,
    analysis: MeetingAnalysisResult,
    options: EnhancedProcessingOptions
  ): Promise<void> {
    // Save action items
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      const actionItems = analysis.actionItems.map((item) => ({
        recording_id: recordingId,
        task_description: item.task,
        assignee_speaker_label: item.assigneeSpeakerLabel,
        priority: item.priority,
        due_date: item.dueDate ? new Date(item.dueDate) : null,
      }));

      await options.supabase
        .schema(options.schema)
        .from("meeting_action_items")
        .insert(actionItems);

      // Save action items to task_insights table
      let projectId: string | null = null;
      let caseId: string | null = null;

      const { data: recording, error: recordingError } = await options.supabase
        .schema(options.schema)
        .from("call_recordings")
        .select("*")
        .eq("id", recordingId)
        .single();

      if (recordingError) {
        console.error("Error fetching recording:", recordingError);
        return;
      }

      const meetingTypeId = recording.meeting_type_id;

      const { data: meetingType, error: meetingTypeError } =
        await options.supabase
          .schema(options.schema)
          .from("meeting_types")
          .select("*")
          .eq("id", meetingTypeId)
          .single();

      if (meetingTypeError) {
        console.error("Error fetching meeting type:", meetingTypeError);
        return;
      }

      //todo
      if (meetingType.task_category === "project" && meetingType.context_id) {
        projectId = meetingType.context_id;
      } else if (
        meetingType.task_category === "case" &&
        analysis.caseIdentifier
      ) {
        caseId = await findCaseByIdentifier(
          options.supabase,
          options.schema,
          analysis.caseIdentifier
        );
      }

      for (const item of analysis.actionItems) {
        const suggested_assignee_id = item.assignee
          ? await findUserIdByName(options.supabase, options.orgId, item.assignee)
          : null;

        const insightPayload = {
          suggested_title: item.task,
          suggested_description:
            item.context || `Extracted from recording: ${recording.title}`,
          suggested_priority: item.priority || "medium",
          suggested_due_date: item.dueDate,
          suggested_assignee_id,
          source_type: "transcript",
          source_reference: recordingId,
          project_id: projectId,
          case_id: caseId,
          confidence_score: 0.9, // Default confidence
          ai_reasoning: "Extracted from meeting transcript by AI.",
          created_by: options.userId, // The user who initiated the processing
        };

        const { error: insightError } = await options.supabase
          .schema(options.schema)
          .from("ai_task_insights")
          .insert(insightPayload);

        if (insightError) {
          console.error(
            "Failed to create AI task insight:",
            insightError.message
          );
        } else {
          console.log(`Successfully created AI task insight for: ${item.task}`);
        }
      }
    }

    // Save decisions
    if (analysis.decisions && analysis.decisions.length > 0) {
      const decisions = analysis.decisions.map((decision) => ({
        recording_id: recordingId,
        decision_text: decision.decision,
        decision_maker_speaker_label: decision.decisionMakerSpeakerLabel,
        context: decision.context,
        impact_level: decision.impact,
        implementation_date: decision.implementationDate
          ? new Date(decision.implementationDate)
          : null,
      }));

      await options.supabase
        .schema(options.schema)
        .from("meeting_decisions")
        .insert(decisions);
    }

    // Save topics
    if (analysis.topics && analysis.topics.length > 0) {
      const topics = analysis.topics.map((topic) => ({
        recording_id: recordingId,
        topic_name: topic.topic,
        importance_score: topic.importance,
        speaker_labels: topic.speakers,
      }));

      await options.supabase
        .schema(options.schema)
        .from("meeting_topics")
        .insert(topics);
    }
  }

  /**
   * Save all enhanced data
   */
  private async saveEnhancedData(
    options: EnhancedProcessingOptions,
    result: ProcessingResult
  ): Promise<void> {
    // Update processing queue status
    await options.supabase
      .schema(options.schema)
      .from("processing_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processing_duration_ms: result.processingTime,
      })
      .eq("recording_id", options.recordingId)
      .eq("task_type", options.taskType);

    console.log("Enhanced data saved successfully");
  }

  private async saveMarkDownReport(
    recording: any,
    transcriptText: any,
    analysis: any,
    supabase: any,
    schema: any,
    userId: string
  ) {
    const markdown = generateMarkdownReport(
      recording,
      transcriptText,
      analysis
    );

    // Initialize Azure Blob Storage
    const gcsService = getGcsService();

    // Upload markdown to Azure
    const transcriptResult = await gcsService.uploadTranscript(
      userId,
      recording.id,
      markdown
    );

    // Update recording with transcript URL
    await supabase
      .schema(schema)
      .from("call_recordings")
      .update({
        gcs_transcript_url: transcriptResult.blobUrl,
        gcs_transcript_blob_name: transcriptResult.blobName,
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", recording.id);
  }
}

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

// Export the enhanced processor
export function createEnhancedProcessor(
  googleApiKey: string
): EnhancedMeetingProcessor {
  return new EnhancedMeetingProcessor(googleApiKey);
}
