// Enhanced Gemini AI Integration for Meeting Intelligence
// Extends existing Google Gemini integration with meeting-specific capabilities

import { GoogleGenAI, FileState } from "https://esm.sh/@google/genai@1.9.0";

export interface SpeakerSegment {
  speaker: string;
  transcription: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
}

export interface MeetingParticipant {
  speakerLabel: string;
  participantName?: string;
  email?: string;
  role: 'host' | 'participant' | 'presenter' | 'observer';
  talkTimeSeconds: number;
}

export interface MeetingActionItem {
  task: string;
  assignee?: string;
  assigneeSpeakerLabel?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context?: string;
}

export interface MeetingDecision {
  decision: string;
  decisionMaker?: string;
  decisionMakerSpeakerLabel?: string;
  context?: string;
  impact: 'low' | 'medium' | 'high';
  implementationDate?: string;
}

export interface MeetingTopic {
  topic: string;
  startTime?: number;
  endTime?: number;
  speakers: string[];
  importance: number; // 0-1 scale
  keyPoints?: string[];
}

export interface MeetingAnalysisResult {
  participants: MeetingParticipant[];
  actionItems: MeetingActionItem[];
  decisions: MeetingDecision[];
  topics: MeetingTopic[];
  summary: string;
  keyTakeaways: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class GeminiMeetingIntelligence {
  private genAI: GoogleGenAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Enhanced transcription with speaker diarization for meetings
   */
  async transcribeWithSpeakerDiarization(
    videoBlob: Blob,
    mimeType: string,
    displayName: string,
    meetingType: 'meeting' | 'call' | 'interview' | 'consultation' = 'meeting'
  ): Promise<{ segments: SpeakerSegment[]; fullTranscript: string }> {
    console.log(`Starting enhanced transcription for ${meetingType}...`);

    // Upload file to Gemini
    let geminiFile = await this.genAI.files.upload({
      file: videoBlob,
      config: {
        mimeType,
        displayName,
      },
    });

    // Wait for file to be processed
    while (geminiFile.state !== FileState.ACTIVE) {
      geminiFile = await this.genAI.files.get({
        name: geminiFile.name ?? "",
      });
      
      if (geminiFile.state === FileState.FAILED) {
        throw new Error(`Failed to upload file to Gemini: ${geminiFile.error}`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Enhanced prompt for meeting transcription with speaker diarization
    const transcriptionPrompt = this.getMeetingTranscriptionPrompt(meetingType);

    if (!geminiFile.uri || !geminiFile.mimeType) {
      throw new Error("Failed to upload file to Gemini");
    }

    // Generate transcription with speaker diarization
    const response = await this.genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: geminiFile.mimeType,
                fileUri: geminiFile.uri,
              },
            },
            { text: transcriptionPrompt },
          ],
        },
      ],
    });

    const responseText = response.text ?? "";
    console.log("Gemini transcription response:", responseText);

    // Remove code fences and language tags if present (e.g., ```json ... ```)
    const cleanedText = responseText.replace(/```json|```/g, '').trim();

    try {
      const segments: SpeakerSegment[] = JSON.parse(cleanedText);
      const fullTranscript = segments
        .map(segment => `${segment.speaker}: ${segment.transcription}`)
        .join('\n');

      console.log("fullTranscript", fullTranscript);

      return { segments, fullTranscript };
    } catch (error) {
      console.error("Failed to parse Gemini response:", error, cleanedText);
      throw new Error("Failed to parse transcription response");
    }
  }

  /**
   * Analyze meeting transcript for intelligence insights
   */
  async analyzeMeetingIntelligence(
    transcript: string,
    segments: SpeakerSegment[],
    meetingType: 'meeting' | 'call' | 'interview' | 'consultation' = 'meeting'
  ): Promise<MeetingAnalysisResult> {
    console.log(`Analyzing meeting intelligence for ${meetingType}...`);

    const analysisPrompt = this.getMeetingAnalysisPrompt(meetingType, transcript);

    const response = await this.genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: analysisPrompt }],
        },
      ],
    });

    const responseText = response.text ?? "";
    console.log("Gemini analysis response:", responseText);

    const cleanedText = responseText.replace(/```json|```/g, '').trim();

    try {
      const analysis: MeetingAnalysisResult = JSON.parse(cleanedText);
      
      // Calculate participant talk times from segments
      analysis.participants = this.calculateParticipantMetrics(segments);
      
      return analysis;
    } catch (error) {
      console.error("Failed to parse analysis response:", error);
      throw new Error("Failed to parse meeting analysis");
    }
  }

  /**
   * Generate meeting summary with action items (combines transcription + analysis)
   */
  async processFullMeetingIntelligence(
    videoBlob: Blob,
    mimeType: string,
    displayName: string,
    meetingType: 'meeting' | 'call' | 'interview' | 'consultation' = 'meeting'
  ): Promise<{
    transcription: { segments: SpeakerSegment[]; fullTranscript: string };
    analysis: MeetingAnalysisResult;
  }> {
    // Step 1: Transcribe with speaker diarization
    const transcription = await this.transcribeWithSpeakerDiarization(
      videoBlob, 
      mimeType, 
      displayName, 
      meetingType
    );

    // Step 2: Analyze for meeting intelligence
    const analysis = await this.analyzeMeetingIntelligence(
      transcription.fullTranscript,
      transcription.segments,
      meetingType
    );

    return { transcription, analysis };
  }

  /**
   * Get enhanced transcription prompt based on meeting type
   */
  private getMeetingTranscriptionPrompt(meetingType: string): string {
    const basePrompt = `Generate detailed audio transcription with speaker diarization for this ${meetingType}. 

CRITICAL: Respond ONLY with a valid JSON array (no markdown code blocks, no extra text). Each item should have this exact structure:

{
  "speaker": "Speaker identifier (e.g., 'Speaker A', 'Speaker B', or inferred name if clear)",
  "transcription": "Exact words spoken by this speaker",
  "startTime": estimated_start_time_in_seconds,
  "endTime": estimated_end_time_in_seconds,
  "confidence": confidence_score_0_to_1
}

Requirements:
- Maintain speaker consistency throughout (same person = same speaker label)
- Include natural pauses and transitions
- Capture all spoken words accurately
- Estimate timing based on speech flow
- Return valid JSON array only`;

    // Add meeting-type specific instructions
    switch (meetingType) {
      case 'meeting':
        return basePrompt + `\n\nFocus on: Meeting discussion flow, decision points, action items mentioned, participant interactions.`;
      case 'interview':
        return basePrompt + `\n\nFocus on: Question-answer format, interviewer vs interviewee roles, key responses.`;
      case 'consultation':
        return basePrompt + `\n\nFocus on: Consultant advice, client questions, recommendations provided.`;
      default:
        return basePrompt;
    }
  }

  /**
   * Get meeting analysis prompt based on meeting type
   */
  private getMeetingAnalysisPrompt(meetingType: string, transcript: string): string {
    const basePrompt = `Analyze this ${meetingType} transcript and extract actionable intelligence.

      CRITICAL: Respond ONLY with valid JSON matching this exact structure:

      {
        "participants": [
          {
            "speakerLabel": "Speaker A",
            "participantName": "Estimated or mentioned name",
            "role": "host|participant|presenter|observer",
            "talkTimeSeconds": estimated_seconds_speaking
          }
        ],
        "actionItems": [
          {
            "task": "Specific actionable task",
            "assignee": "Person responsible (if mentioned)",
            "assigneeSpeakerLabel": "Speaker label of assignee",
            "dueDate": "Due date if mentioned",
            "priority": "low|medium|high|urgent",
            "context": "Context around the task"
          }
        ],
        "decisions": [
          {
            "decision": "Decision made",
            "decisionMaker": "Person who decided",
            "decisionMakerSpeakerLabel": "Speaker label",
            "context": "Context of decision",
            "impact": "low|medium|high",
            "implementationDate": "When to implement if mentioned"
          }
        ],
        "topics": [
          {
            "topic": "Main topic discussed",
            "speakers": ["Speaker A", "Speaker B"],
            "importance": 0.8,
            "keyPoints": ["Key point 1", "Key point 2"]
          }
        ],
        "summary": "Concise 2-3 sentence summary of the ${meetingType}",
        "keyTakeaways": ["Main takeaway 1", "Main takeaway 2"],
        "sentiment": "positive|neutral|negative"
      }

      TRANSCRIPT:
      ${transcript}`;

    return basePrompt;
  }

  /**
   * Analyze transcript with custom system prompt from meeting type
   */
  async analyzeWithCustomPrompt(
    transcript: string,
    segments: SpeakerSegment[],
    systemPrompt: string,
    outputFormat: string = "json"
  ): Promise<any> {
    try {
      // Format segments for better context
      const segmentedTranscript = segments
        .map((seg) => `**${seg.speaker}**: ${seg.transcription}`)
        .join("\n\n");

      const fullTranscript = `
MEETING TRANSCRIPT:
${segmentedTranscript}

FULL TRANSCRIPT TEXT:
${transcript}
      `.trim();

      // Create base prompt that enforces output format
      const basePrompt = this.getBasePromptForFormat(outputFormat);
      
      // Combine base prompt with custom system prompt
      const combinedPrompt = `${basePrompt}

CUSTOM ANALYSIS INSTRUCTIONS:
${systemPrompt}

${fullTranscript}`;

      const result = await this.genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: combinedPrompt
              }
            ]
          }
        ]
      });

      const responseText = result.text ?? "";
      console.log("Custom prompt analysis response:", responseText);

      // Try to parse based on output format
      if (outputFormat === "json") {
        try {
          // Remove code fences if present
          const cleanedText = responseText.replace(/```json|```/g, '').trim();
          return JSON.parse(cleanedText);
        } catch (parseError) {
          console.error("Failed to parse JSON response, returning as structured object:", parseError);
          return { 
            analysis: responseText,
            parseError: true,
            rawResponse: responseText 
          };
        }
      } else {
        // Return as structured object for other formats
        return {
          analysis: responseText,
          outputFormat: outputFormat,
          rawResponse: responseText
        };
      }
    } catch (error) {
      console.error("Custom prompt analysis failed:", error);
      throw new Error(`Custom analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get base prompt that enforces output format structure
   */
  private getBasePromptForFormat(outputFormat: string): string {
    switch (outputFormat) {
      case "json":
        return `Analyze the meeting transcript provided below. You must respond with ONLY valid JSON in this exact structure (no markdown code blocks, no extra text):

{
  "caseIdentifier": "Case name or ID if mentioned in the transcript, otherwise null",
  "participants": [
          {
            "speakerLabel": "Speaker A",
            "participantName": "Estimated or mentioned name",
            "role": "host|participant|presenter|observer",
            "talkTimeSeconds": estimated_seconds_speaking
          }
        ],
        "actionItems": [
          {
            "task": "Specific actionable task",
            "assignee": "Person responsible, in 'Firstname L.' format (e.g., 'John D.') if possible",
            "assigneeSpeakerLabel": "Speaker label of assignee",
            "dueDate": "Due date if mentioned",
            "priority": "low|medium|high|urgent",
            "context": "Context around the task"
          }
        ],
        "decisions": [
          {
            "decision": "Decision made",
            "decisionMaker": "Person who decided",
            "decisionMakerSpeakerLabel": "Speaker label",
            "context": "Context of decision",
            "impact": "low|medium|high",
            "implementationDate": "When to implement if mentioned"
          }
        ],
        "topics": [
          {
            "topic": "Main topic discussed",
            "speakers": ["Speaker A", "Speaker B"],
            "importance": 0.8,
            "keyPoints": ["Key point 1", "Key point 2"]
          }
        ],
        "summary": "Concise 2-3 sentence summary of the meeting",
        "keyTakeaways": ["Main takeaway 1", "Main takeaway 2"],
        "sentiment": "positive|neutral|negative"
      }
}

CRITICAL: Ensure all JSON is properly formatted and escaped. No text outside the JSON structure.`;

      case "markdown":
        return `Analyze the meeting transcript and provide a well-structured markdown report. Use the following structure:

# Meeting Analysis

## Summary
[Brief summary of the meeting]

## Key Points
- [Key point 1]
- [Key point 2]

## Action Items
- [ ] [Action item 1] - *Assigned to: [Person] | Due: [Date]*
- [ ] [Action item 2] - *Assigned to: [Person] | Due: [Date]*

## Participants
- **[Name/Role]**: [Brief contribution summary]

## Decisions Made
- [Decision 1]
- [Decision 2]

## Follow-up Items
- [Follow-up item 1]
- [Follow-up item 2]

## Custom Analysis
[Additional analysis based on custom instructions]`;

      case "text":
      default:
        return `Analyze the meeting transcript and provide a clear, structured text report. Use the following format:

MEETING ANALYSIS REPORT
=======================

SUMMARY:
[Brief summary of the meeting]

KEY POINTS:
- [Key point 1]
- [Key point 2]

ACTION ITEMS:
- [Action item 1] (Assigned to: [Person], Due: [Date])
- [Action item 2] (Assigned to: [Person], Due: [Date])

PARTICIPANTS:
- [Name/Role]: [Brief contribution summary]

DECISIONS MADE:
- [Decision 1]
- [Decision 2]

FOLLOW-UP ITEMS:
- [Follow-up item 1]
- [Follow-up item 2]

CUSTOM ANALYSIS:
[Additional analysis based on custom instructions]`;
    }
  }

  /**
   * Calculate participant metrics from transcript segments
   */
  private calculateParticipantMetrics(segments: SpeakerSegment[]): MeetingParticipant[] {
    const participantMap = new Map<string, MeetingParticipant>();

    segments.forEach(segment => {
      const speaker = segment.speaker;
      
      if (!participantMap.has(speaker)) {
        participantMap.set(speaker, {
          speakerLabel: speaker,
          role: 'participant', // Default role
          talkTimeSeconds: 0,
        });
      }

      const participant = participantMap.get(speaker)!;
      
      // Estimate talk time based on transcription length (rough approximation)
      const estimatedSeconds = Math.max(
        segment.transcription.length / 10, // ~10 chars per second average
        (segment.endTime || 0) - (segment.startTime || 0)
      );
      
      participant.talkTimeSeconds += estimatedSeconds;
    });

    return Array.from(participantMap.values());
  }

  /**
   * Cleanup Gemini file after processing
   */
  async cleanupGeminiFile(fileName: string): Promise<void> {
    try {
      await this.genAI.files.delete({ name: fileName });
      console.log(`Cleaned up Gemini file: ${fileName}`);
    } catch (error) {
      console.error(`Failed to cleanup Gemini file ${fileName}:`, error);
    }
  }
}

// Export default instance creation function
export function createGeminiMeetingIntelligence(apiKey: string): GeminiMeetingIntelligence {
  return new GeminiMeetingIntelligence(apiKey);
}