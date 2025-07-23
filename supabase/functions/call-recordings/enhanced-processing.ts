// Enhanced Meeting Intelligence Processing
// Extends existing call-recordings with meeting intelligence using ONLY Vertex AI Gemini

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";
import { 
  GeminiMeetingIntelligence, 
  SpeakerSegment, 
  MeetingAnalysisResult 
} from "./gemini-meeting-intelligence.ts";
import MeetingPromptLibrary from "./meeting-prompts.ts";

export interface EnhancedProcessingOptions {
  recordingId: string;
  taskType: 'transcribe' | 'analyze' | 'all';
  meetingType: 'meeting' | 'call' | 'interview' | 'consultation';
  analysisType?: string; // Which analysis prompt to use
  schema: string;
  supabase: any;
  googleApiKey: string;
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
    this.gcsService = new GoogleCloudStorageService();
  }

  /**
   * Process meeting recording with enhanced intelligence
   * Maintains backward compatibility with existing legal recordings
   */
  async processRecording(options: EnhancedProcessingOptions): Promise<ProcessingResult> {
    const startTime = Date.now();
    console.log(`Starting enhanced processing for recording ${options.recordingId}`);

    try {
      // Get recording details
      const recording = await this.getRecordingDetails(options);
      if (!recording) {
        return { success: false, error: "Recording not found" };
      }

      let result: ProcessingResult = { success: true };

      // Step 1: Enhanced Transcription with Speaker Diarization
      if (options.taskType === 'transcribe' || options.taskType === 'all') {
        const transcriptResult = await this.processTranscription(recording, options);
        if (!transcriptResult.success) {
          return transcriptResult;
        }
        result.transcript = transcriptResult.transcript;
      }

      // Step 2: Meeting Intelligence Analysis (using existing transcript if available)
      if (options.taskType === 'analyze' || options.taskType === 'all') {
        const analysisResult = await this.processAnalysis(recording, options, result.transcript);
        if (!analysisResult.success) {
          return analysisResult;
        }
        result.analysis = analysisResult.analysis;
      }

      // Step 3: Save enhanced data to database
      await this.saveEnhancedData(recording, options, result);

      result.processingTime = Date.now() - startTime;
      console.log(`Enhanced processing completed in ${result.processingTime}ms`);

      return result;

    } catch (error) {
      console.error("Enhanced processing error:", error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get recording details from database
   */
  private async getRecordingDetails(options: EnhancedProcessingOptions): Promise<any> {
    const { data: recording, error } = await options.supabase
      .schema(options.schema)
      .from('call_recordings')
      .select('*')
      .eq('id', options.recordingId)
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
      const videoBytes = await this.gcsService.downloadBlob(recording.gcs_video_blob_name);
      const videoBlob = new Blob([videoBytes], { type: recording.mime_type });

      // Use enhanced Gemini processing
      const transcriptionResult = await this.geminiAI.transcribeWithSpeakerDiarization(
        videoBlob,
        recording.mime_type,
        recording.gcs_video_blob_name,
        options.meetingType
      );

      // Update recording with transcript data
      await options.supabase
        .schema(options.schema)
        .from('call_recordings')
        .update({
          transcript_text: transcriptionResult.fullTranscript,
          transcript_segments: transcriptionResult.segments,
          speakers_metadata: this.extractSpeakersMetadata(transcriptionResult.segments),
          status: options.taskType === 'transcribe' ? 'completed' : 'analyzing'
        })
        .eq('id', options.recordingId);

      // Save speaker segments to new participant table
      await this.saveParticipants(recording.id, transcriptionResult.segments, options);

      return {
        success: true,
        transcript: transcriptionResult
      };

    } catch (error) {
      console.error("Transcription error:", error);
      
      // Update recording status to failed
      await options.supabase
        .schema(options.schema)
        .from('call_recordings')
        .update({
          status: 'failed',
          processing_error: error.message
        })
        .eq('id', options.recordingId);

      return {
        success: false,
        error: error.message
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
  ): Promise<{ success: boolean; analysis?: MeetingAnalysisResult; error?: string }> {
    console.log("Starting meeting intelligence analysis...");

    try {
      // Get transcript (either from current processing or database)
      let transcript = transcriptData?.fullTranscript || recording.transcript_text;
      let segments = transcriptData?.segments || recording.transcript_segments || [];

      if (!transcript) {
        return { success: false, error: "No transcript available for analysis" };
      }

      // Use enhanced Gemini analysis
      const analysisResult = await this.geminiAI.analyzeMeetingIntelligence(
        transcript,
        segments,
        options.meetingType
      );

      // Also run specific analysis if requested
      let specificAnalysis = null;
      if (options.analysisType) {
        specificAnalysis = await this.runSpecificAnalysis(
          transcript,
          options.analysisType,
          options
        );
      }

      // Update recording with analysis results
      const updateData: any = {
        ai_analysis: analysisResult,
        ai_summary: analysisResult.summary,
        key_topics: analysisResult.keyTakeaways,
        sentiment: analysisResult.sentiment,
        status: 'completed'
      };

      if (specificAnalysis) {
        updateData.specific_analysis = specificAnalysis;
      }

      await options.supabase
        .schema(options.schema)
        .from('call_recordings')
        .update(updateData)
        .eq('id', options.recordingId);

      // Save structured data to meeting-specific tables
      await this.saveMeetingData(recording.id, analysisResult, options);

      return {
        success: true,
        analysis: analysisResult
      };

    } catch (error) {
      console.error("Analysis error:", error);
      
      await options.supabase
        .schema(options.schema)
        .from('call_recordings')
        .update({
          status: 'failed',
          processing_error: error.message
        })
        .eq('id', options.recordingId);

      return {
        success: false,
        error: error.message
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
        date: new Date().toISOString().split('T')[0],
        meetingType: options.meetingType,
        duration: '45 minutes', // TODO: Calculate from recording
        generationDate: new Date().toLocaleString()
      }
    );

    // Use Gemini for specific analysis
    const response = await this.geminiAI['genAI'].models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: filledPrompt }]
      }]
    });

    const responseText = response.response.text();

    try {
      return promptTemplate.outputFormat === 'json' 
        ? JSON.parse(responseText)
        : responseText;
    } catch (error) {
      console.error("Failed to parse specific analysis:", error);
      return responseText; // Return raw text if JSON parsing fails
    }
  }

  /**
   * Extract speakers metadata from segments
   */
  private extractSpeakersMetadata(segments: SpeakerSegment[]): any {
    const speakerMap = new Map();
    
    segments.forEach(segment => {
      if (!speakerMap.has(segment.speaker)) {
        speakerMap.set(segment.speaker, {
          label: segment.speaker,
          utteranceCount: 0,
          totalWords: 0,
          estimatedTalkTime: 0
        });
      }
      
      const speaker = speakerMap.get(segment.speaker);
      speaker.utteranceCount++;
      speaker.totalWords += segment.transcription.split(' ').length;
      speaker.estimatedTalkTime += segment.transcription.length / 10; // rough estimate
    });

    return {
      totalSpeakers: speakerMap.size,
      speakers: Array.from(speakerMap.values())
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
    
    segments.forEach(segment => {
      if (!speakerMap.has(segment.speaker)) {
        speakerMap.set(segment.speaker, {
          recording_id: recordingId,
          participant_name: segment.speaker,
          speaker_label: segment.speaker,
          role: 'participant',
          talk_time_seconds: 0
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
        .from('meeting_participants')
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
      const actionItems = analysis.actionItems.map(item => ({
        recording_id: recordingId,
        task_description: item.task,
        assignee_speaker_label: item.assigneeSpeakerLabel,
        priority: item.priority,
        due_date: item.dueDate ? new Date(item.dueDate) : null
      }));

      await options.supabase
        .schema(options.schema)
        .from('meeting_action_items')
        .insert(actionItems);
    }

    // Save decisions
    if (analysis.decisions && analysis.decisions.length > 0) {
      const decisions = analysis.decisions.map(decision => ({
        recording_id: recordingId,
        decision_text: decision.decision,
        decision_maker_speaker_label: decision.decisionMakerSpeakerLabel,
        context: decision.context,
        impact_level: decision.impact,
        implementation_date: decision.implementationDate ? new Date(decision.implementationDate) : null
      }));

      await options.supabase
        .schema(options.schema)
        .from('meeting_decisions')
        .insert(decisions);
    }

    // Save topics
    if (analysis.topics && analysis.topics.length > 0) {
      const topics = analysis.topics.map(topic => ({
        recording_id: recordingId,
        topic_name: topic.topic,
        importance_score: topic.importance,
        speaker_labels: topic.speakers
      }));

      await options.supabase
        .schema(options.schema)
        .from('meeting_topics')
        .insert(topics);
    }
  }

  /**
   * Save all enhanced data
   */
  private async saveEnhancedData(
    recording: any,
    options: EnhancedProcessingOptions,
    result: ProcessingResult
  ): Promise<void> {
    // Update processing queue status
    await options.supabase
      .schema(options.schema)
      .from('processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_duration_ms: result.processingTime
      })
      .eq('recording_id', options.recordingId)
      .eq('task_type', options.taskType);

    console.log("Enhanced data saved successfully");
  }
}

// Export the enhanced processor
export function createEnhancedProcessor(googleApiKey: string): EnhancedMeetingProcessor {
  return new EnhancedMeetingProcessor(googleApiKey);
}