// Meeting Intelligence Prompts for Vertex AI Gemini
// All prompts use only Google Gemini - NO OpenAI integration

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  outputFormat: 'text' | 'json' | 'markdown';
}

export class MeetingPromptLibrary {
  /**
   * Get all available meeting prompt templates
   */
  static getAllPrompts(): PromptTemplate[] {
    return [
      this.getExecutiveSummaryPrompt(),
      this.getMeetingMinutesPrompt(),
      this.getActionItemsPrompt(),
      this.getDecisionLogPrompt(),
      this.getTopicAnalysisPrompt(),
      this.getParticipantAnalysisPrompt(),
      this.getFollowUpPrompt(),
      this.getLegalMeetingPrompt(),
      this.getClientConsultationPrompt(),
      this.getTeamStandupPrompt(),
      this.getSalesCallPrompt(),
    ];
  }

  /**
   * Executive Summary - High-level overview for leadership
   */
  static getExecutiveSummaryPrompt(): PromptTemplate {
    return {
      name: 'executive_summary',
      description: 'Concise executive summary for leadership review',
      outputFormat: 'json',
      template: `Analyze this meeting transcript and create an executive summary.

RESPOND ONLY with valid JSON in this exact format:

{
  "executiveSummary": "2-3 sentence high-level summary focusing on business impact and outcomes",
  "keyDecisions": [
    {
      "decision": "Decision made",
      "impact": "Business impact of this decision",
      "timeline": "Implementation timeline if mentioned"
    }
  ],
  "criticalActions": [
    {
      "action": "Most important action item",
      "owner": "Person responsible",
      "deadline": "Due date",
      "businessRisk": "Risk if not completed"
    }
  ],
  "resourceRequirements": ["Resource 1", "Resource 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "escalationItems": ["Items requiring leadership attention"],
  "overallSentiment": "positive|neutral|negative",
  "meetingEffectiveness": "high|medium|low"
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Detailed Meeting Minutes - Comprehensive record
   */
  static getMeetingMinutesPrompt(): PromptTemplate {
    return {
      name: 'meeting_minutes',
      description: 'Formal meeting minutes with all details',
      outputFormat: 'markdown',
      template: `Generate professional meeting minutes from this transcript.

# Meeting Minutes

## Meeting Overview
- **Date**: {{date}}
- **Duration**: {{duration}}
- **Meeting Type**: {{meetingType}}

## Attendees
{{participants}}

## Agenda Items Discussed

### [Extract main topics and create sections]

## Key Discussions

### [For each major topic, provide:]
- **Topic**: Topic name
- **Discussion Summary**: Key points raised
- **Participants**: Who contributed to this topic
- **Outcome**: Resolution or next steps

## Decisions Made
1. **Decision**: [What was decided]
   - **Decision Maker**: [Who made the decision]
   - **Context**: [Why this decision was made]
   - **Implementation**: [How and when]

## Action Items
| Task | Assigned To | Due Date | Priority | Notes |
|------|-------------|----------|----------|-------|
| [Task] | [Person] | [Date] | [High/Medium/Low] | [Additional context] |

## Follow-up Required
- [Item 1]
- [Item 2]

## Next Meeting
- **Date**: [If scheduled]
- **Agenda**: [Topics for next meeting]

---
*Generated from meeting transcript on {{generationDate}}*

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Action Items Focus - Extract and prioritize tasks
   */
  static getActionItemsPrompt(): PromptTemplate {
    return {
      name: 'action_items',
      description: 'Extract and prioritize all action items',
      outputFormat: 'json',
      template: `Extract all actionable tasks from this meeting transcript.

RESPOND ONLY with valid JSON:

{
  "actionItems": [
    {
      "id": "unique_identifier",
      "task": "Clear, actionable task description",
      "assignee": "Person responsible (name or speaker label)",
      "assigneeSpeakerLabel": "Speaker A/B/etc",
      "dueDate": "Due date if mentioned",
      "priority": "urgent|high|medium|low",
      "category": "Category of task (e.g., 'development', 'marketing', 'legal')",
      "dependencies": ["Other tasks this depends on"],
      "estimatedHours": "Time estimate if mentioned",
      "context": "Context around why this task is needed",
      "successCriteria": "How to know when it's complete"
    }
  ],
  "unassignedTasks": [
    {
      "task": "Tasks mentioned but not assigned to anyone",
      "suggestedOwner": "Recommended person based on context",
      "urgency": "How urgent this seems"
    }
  ],
  "followUpMeetings": [
    {
      "purpose": "Why this meeting is needed",
      "participants": ["Who should attend"],
      "suggestedDate": "When it should happen"
    }
  ],
  "blockers": ["Items that might prevent task completion"],
  "resources": ["Resources mentioned as needed"]
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Decision Log - Track all decisions made
   */
  static getDecisionLogPrompt(): PromptTemplate {
    return {
      name: 'decision_log',
      description: 'Comprehensive log of all decisions made',
      outputFormat: 'json',
      template: `Create a comprehensive decision log from this meeting.

RESPOND ONLY with valid JSON:

{
  "decisions": [
    {
      "id": "decision_unique_id",
      "decision": "What was decided",
      "decisionMaker": "Primary decision maker",
      "decisionMakerRole": "Their role/title",
      "decisionType": "strategic|tactical|operational|policy",
      "alternatives": ["Other options that were considered"],
      "rationale": "Why this decision was made",
      "stakeholders": ["Who is affected by this decision"],
      "implementationPlan": "How this will be implemented",
      "timeline": "When this will be implemented",
      "successMetrics": ["How success will be measured"],
      "risks": ["Potential risks or downsides"],
      "budget": "Budget implications if mentioned",
      "reversible": "true|false - can this decision be easily changed",
      "dependencies": ["What needs to happen first"],
      "communicationPlan": "How this will be communicated"
    }
  ],
  "pendingDecisions": [
    {
      "topic": "Decision that needs to be made",
      "deadline": "When decision is needed",
      "decisionMaker": "Who should decide",
      "information": "What info is needed to decide"
    }
  ],
  "assumptions": ["Key assumptions underlying the decisions"],
  "impacts": {
    "positive": ["Positive impacts expected"],
    "negative": ["Potential negative impacts"],
    "unknown": ["Uncertain impacts to monitor"]
  }
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Topic Analysis - Deep dive into discussion themes
   */
  static getTopicAnalysisPrompt(): PromptTemplate {
    return {
      name: 'topic_analysis',
      description: 'Analyze discussion topics and themes',
      outputFormat: 'json',
      template: `Analyze the topics and themes discussed in this meeting.

RESPOND ONLY with valid JSON:

{
  "topics": [
    {
      "name": "Topic name",
      "importance": 0.9,
      "timeSpent": "Estimated minutes discussing this",
      "participants": ["Speaker A", "Speaker B"],
      "keyPoints": ["Main point 1", "Main point 2"],
      "consensus": "agreement|disagreement|mixed|unclear",
      "outcome": "What was concluded about this topic",
      "nextSteps": ["What happens next for this topic"],
      "expertise": "Who showed most knowledge on this topic",
      "concerns": ["Concerns raised about this topic"],
      "opportunities": ["Opportunities identified"]
    }
  ],
  "topicFlow": [
    {
      "sequence": 1,
      "topic": "Topic name",
      "transition": "How conversation moved to this topic",
      "duration": "Estimated time on topic"
    }
  ],
  "emergingThemes": [
    {
      "theme": "Overarching theme",
      "evidence": ["Supporting evidence from transcript"],
      "implications": "What this means for the organization"
    }
  ],
  "unresolved": [
    {
      "topic": "Topic that wasn't fully resolved",
      "reason": "Why it wasn't resolved",
      "nextAction": "What should happen next"
    }
  ],
  "expertise": [
    {
      "person": "Speaker label or name",
      "topics": ["Topics they showed expertise in"],
      "contribution": "Type of contribution made"
    }
  ]
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Participant Analysis - Understand meeting dynamics
   */
  static getParticipantAnalysisPrompt(): PromptTemplate {
    return {
      name: 'participant_analysis',
      description: 'Analyze participant contributions and dynamics',
      outputFormat: 'json',
      template: `Analyze participant behavior and contributions in this meeting.

RESPOND ONLY with valid JSON:

{
  "participants": [
    {
      "speakerLabel": "Speaker A",
      "estimatedName": "Name if mentioned or inferable",
      "role": "host|presenter|contributor|observer",
      "engagementLevel": "high|medium|low",
      "contributionType": "questions|solutions|concerns|information|decisions",
      "talkTimePercent": 25.5,
      "interruptionsCount": 3,
      "questionsAsked": 5,
      "decisionsInfluenced": ["Decision they influenced"],
      "expertise": ["Areas where they showed knowledge"],
      "concerns": ["Concerns they raised"],
      "sentiment": "positive|neutral|negative",
      "collaboration": "How well they collaborated with others"
    }
  ],
  "dynamics": {
    "meetingLeader": "Who led the meeting",
    "dominantSpeakers": ["Speakers who talked most"],
    "quietParticipants": ["Speakers who contributed less"],
    "interactionPattern": "collaborative|hierarchical|chaotic|structured",
    "conflictAreas": ["Topics where there was disagreement"],
    "alignment": "high|medium|low agreement among participants"
  },
  "communication": {
    "clarity": "high|medium|low - how clear was communication",
    "efficiency": "high|medium|low - how efficient was the discussion",
    "inclusivity": "Were all voices heard",
    "interruptions": "Total number of interruptions",
    "tangents": "Number of off-topic discussions"
  },
  "recommendations": [
    {
      "area": "Area for improvement",
      "suggestion": "Specific suggestion",
      "benefit": "Expected benefit"
    }
  ]
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Follow-up Planning - Next steps and scheduling
   */
  static getFollowUpPrompt(): PromptTemplate {
    return {
      name: 'follow_up',
      description: 'Plan follow-up actions and meetings',
      outputFormat: 'json',
      template: `Identify all follow-up requirements from this meeting.

RESPOND ONLY with valid JSON:

{
  "immediateActions": [
    {
      "action": "Action needed within 24-48 hours",
      "owner": "Who should do it",
      "urgency": "Why this is immediate",
      "impact": "What happens if delayed"
    }
  ],
  "followUpMeetings": [
    {
      "purpose": "Why this meeting is needed",
      "type": "one-on-one|team|stakeholder|review",
      "participants": ["Required attendees"],
      "duration": "Suggested duration",
      "agenda": ["Key topics to cover"],
      "timing": "When this should happen",
      "preparation": ["What participants should prepare"]
    }
  ],
  "reporting": [
    {
      "report": "What report is needed",
      "audience": "Who should receive it",
      "content": ["Key information to include"],
      "deadline": "When it's needed",
      "format": "Format preference"
    }
  ],
  "communications": [
    {
      "message": "What needs to be communicated",
      "audience": "Who needs to know",
      "method": "email|slack|presentation|memo",
      "timing": "When to communicate",
      "sender": "Who should send it"
    }
  ],
  "dependencies": [
    {
      "item": "What depends on something else",
      "dependency": "What it depends on",
      "impact": "Impact if dependency isn't met"
    }
  ],
  "timeline": [
    {
      "milestone": "Key milestone",
      "date": "Target date",
      "owner": "Who is responsible",
      "prerequisites": ["What must be done first"]
    }
  ]
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Legal Meeting Analysis - For legal consultations
   */
  static getLegalMeetingPrompt(): PromptTemplate {
    return {
      name: 'legal_meeting',
      description: 'Analysis focused on legal matters and compliance',
      outputFormat: 'json',
      template: `Analyze this legal meeting/consultation transcript.

RESPOND ONLY with valid JSON:

{
  "legalMatters": [
    {
      "matter": "Legal issue discussed",
      "category": "contract|litigation|compliance|corporate|employment|ip",
      "priority": "urgent|high|medium|low",
      "advice": "Legal advice given",
      "advisor": "Who provided the advice",
      "risks": ["Legal risks identified"],
      "mitigations": ["Risk mitigation strategies"],
      "deadlines": ["Legal deadlines mentioned"],
      "documentation": ["Documents mentioned or needed"]
    }
  ],
  "complianceItems": [
    {
      "requirement": "Compliance requirement",
      "deadline": "When compliance is required",
      "responsible": "Who is responsible",
      "status": "current status",
      "actions": ["Actions needed for compliance"]
    }
  ],
  "clientConcerns": [
    {
      "concern": "Client's main concern",
      "urgency": "How urgent client considers this",
      "advisor": "Attorney/advisor response",
      "resolution": "Proposed resolution"
    }
  ],
  "billableActivities": [
    {
      "activity": "Activity that may be billable",
      "timeEstimate": "Estimated time required",
      "rate": "Rate category if mentioned",
      "responsible": "Who will perform the work"
    }
  ],
  "privileged": {
    "isPrivileged": true,
    "participants": ["Only attorney-client privileged attendees"],
    "confidentialityLevel": "attorney-client|work-product|confidential"
  },
  "followUpLegal": [
    {
      "action": "Legal action required",
      "deadline": "Legal deadline",
      "consequences": "Consequences of missing deadline",
      "responsible": "Attorney responsible"
    }
  ]
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Client Consultation Analysis
   */
  static getClientConsultationPrompt(): PromptTemplate {
    return {
      name: 'client_consultation',
      description: 'Analysis for client consultation meetings',
      outputFormat: 'json',
      template: `Analyze this client consultation transcript.

RESPOND ONLY with valid JSON:

{
  "clientProfile": {
    "clientConcerns": ["Primary concerns expressed"],
    "clientGoals": ["What client wants to achieve"],
    "clientExpectations": ["Client's expectations"],
    "decisionMakers": ["Who makes decisions for client"],
    "budget": "Budget constraints mentioned",
    "timeline": "Client's preferred timeline"
  },
  "servicesDiscussed": [
    {
      "service": "Service discussed",
      "clientInterest": "high|medium|low",
      "advisor": "Who presented this service",
      "benefits": ["Benefits explained to client"],
      "costs": "Cost information provided",
      "timeline": "Implementation timeline"
    }
  ],
  "recommendations": [
    {
      "recommendation": "What was recommended",
      "rationale": "Why this was recommended",
      "priority": "urgent|high|medium|low",
      "nextSteps": ["Immediate next steps"],
      "clientResponse": "How client responded"
    }
  ],
  "objections": [
    {
      "objection": "Client objection or concern",
      "category": "cost|time|complexity|risk",
      "response": "How objection was addressed",
      "resolved": "true|false"
    }
  ],
  "commitments": [
    {
      "commitment": "What was committed to",
      "provider": "Who made the commitment",
      "deadline": "When it's due",
      "deliverable": "What will be delivered"
    }
  ],
  "nextSteps": {
    "clientActions": ["What client needs to do"],
    "providerActions": ["What service provider needs to do"],
    "timeline": "Overall timeline for next steps",
    "followUp": "When to follow up"
  }
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Team Standup Analysis
   */
  static getTeamStandupPrompt(): PromptTemplate {
    return {
      name: 'team_standup',
      description: 'Analysis for daily/weekly team standup meetings',
      outputFormat: 'json',
      template: `Analyze this team standup meeting transcript.

RESPOND ONLY with valid JSON:

{
  "teamUpdates": [
    {
      "teamMember": "Team member name/speaker",
      "completed": ["Work completed since last standup"],
      "inProgress": ["Current work in progress"],
      "planned": ["Work planned for next period"],
      "blockers": ["Blockers or impediments"],
      "help": ["Help needed from others"],
      "capacity": "overloaded|normal|available"
    }
  ],
  "projectStatus": [
    {
      "project": "Project name",
      "status": "on-track|at-risk|delayed|completed",
      "progress": "Progress percentage if mentioned",
      "blockers": ["Project-level blockers"],
      "milestones": ["Upcoming milestones"],
      "risks": ["Risks identified"]
    }
  ],
  "blockers": [
    {
      "blocker": "Description of blocker",
      "affectedPerson": "Who is blocked",
      "resolver": "Who can help resolve",
      "urgency": "urgent|high|medium|low",
      "impact": "Impact if not resolved"
    }
  ],
  "collaboration": [
    {
      "type": "Help offered or requested",
      "from": "Who is offering help",
      "to": "Who needs help",
      "topic": "What help is about"
    }
  ],
  "metrics": {
    "velocity": "Team velocity if mentioned",
    "burndown": "Sprint/iteration burndown status",
    "quality": "Quality metrics mentioned",
    "morale": "Team morale indicators"
  },
  "decisions": [
    {
      "decision": "Technical or process decision",
      "rationale": "Why this decision was made",
      "impact": "Impact on team or project"
    }
  ]
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Sales Call Analysis
   */
  static getSalesCallPrompt(): PromptTemplate {
    return {
      name: 'sales_call',
      description: 'Analysis for sales calls and prospect meetings',
      outputFormat: 'json',
      template: `Analyze this sales call transcript.

RESPOND ONLY with valid JSON:

{
  "prospectProfile": {
    "company": "Company name if mentioned",
    "industry": "Industry sector",
    "role": "Prospect's role/title",
    "decisionMaker": "true|false|unknown",
    "budget": "Budget information revealed",
    "timeline": "Purchase timeline",
    "painPoints": ["Problems prospect mentioned"],
    "currentSolution": "What they use now"
  },
  "needsAssessment": {
    "primaryNeed": "Main need identified",
    "secondaryNeeds": ["Other needs mentioned"],
    "criticalRequirements": ["Must-have requirements"],
    "niceToHave": ["Preferred but not required"],
    "dealBreakers": ["Things that would prevent purchase"]
  },
  "productPresentation": {
    "featuresDiscussed": ["Features that were presented"],
    "benefitsHighlighted": ["Benefits emphasized"],
    "demoGiven": "true|false",
    "prospectReaction": "positive|neutral|negative|mixed",
    "questionsAsked": ["Questions prospect asked"],
    "objections": ["Objections raised"]
  },
  "objectionHandling": [
    {
      "objection": "Objection raised",
      "category": "price|features|timing|authority|need",
      "response": "How it was addressed",
      "resolved": "true|false|partial",
      "followUp": "Follow-up needed"
    }
  ],
  "competitiveInfo": {
    "competitors": ["Competitors mentioned"],
    "competitorAdvantages": ["What competitors do well"],
    "ourAdvantages": ["Our advantages highlighted"],
    "competitiveThreats": ["Threats from competition"]
  },
  "nextSteps": {
    "proposalRequested": "true|false",
    "trialOffered": "true|false",
    "followUpScheduled": "true|false",
    "decisionTimeline": "When decision will be made",
    "internalSteps": ["What we need to do internally"],
    "prospectSteps": ["What prospect committed to do"]
  },
  "dealQualification": {
    "budget": "qualified|unqualified|unknown",
    "authority": "qualified|unqualified|unknown", 
    "need": "qualified|unqualified|unknown",
    "timeline": "qualified|unqualified|unknown",
    "likelihood": "high|medium|low",
    "dealSize": "Estimated deal value if discussed"
  }
}

TRANSCRIPT:
{{transcript}}`
    };
  }

  /**
   * Get a specific prompt by name
   */
  static getPrompt(name: string): PromptTemplate | null {
    const prompts = this.getAllPrompts();
    return prompts.find(p => p.name === name) || null;
  }

  /**
   * Replace template variables in prompt
   */
  static fillTemplate(template: string, variables: Record<string, string>): string {
    let filledTemplate = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
    });

    return filledTemplate;
  }
}

// Export for use in the main call-recordings function
export default MeetingPromptLibrary;