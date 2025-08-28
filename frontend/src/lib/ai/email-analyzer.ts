/**
 * AI-powered email content analysis service
 * Extracts entities, intent, and metadata from email content using LLM APIs
 */

export interface EmailAnalysisRequest {
  emailId: string;
  subject: string;
  fromName?: string;
  fromEmail: string;
  htmlBody?: string;
  textBody?: string;
  receivedAt: string;
  hasAttachments: boolean;
  attachmentTypes?: string[];
}

export interface ExtractedEntities {
  names: string[];
  organizations: string[];
  amounts: Array<{ value: number; currency: string; context: string }>;
  dates: Array<{ date: string; context: string }>;
  caseNumbers: string[];
  legalTerms: string[];
  locations: string[];
  phoneNumbers: string[];
  emailAddresses: string[];
}

export interface EmailAnalysisResult {
  summary: string;
  intent: EmailIntent;
  urgencyLevel: UrgencyLevel;
  topicClassification: string[];
  extractedEntities: ExtractedEntities;
  detectedLanguage: string;
  confidenceScore: number;
  processingTimeMs: number;
  analysisProvider: string;
  analysisModel: string;
}

export type EmailIntent = 
  | 'new_case_inquiry'
  | 'case_update'
  | 'document_request'
  | 'payment_inquiry'
  | 'scheduling_request'
  | 'complaint'
  | 'question'
  | 'follow_up'
  | 'response'
  | 'forwarded_info'
  | 'other';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Email analyzer class that handles AI-powered content analysis
 */
export class EmailAnalyzer {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Analyze email content using the configured AI provider
   */
  async analyzeEmail(request: EmailAnalysisRequest): Promise<EmailAnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildAnalysisPrompt(request);
      const response = await this.callAIProvider(prompt);
      const analysis = this.parseAnalysisResponse(response);

      return {
        ...analysis,
        processingTimeMs: Date.now() - startTime,
        analysisProvider: this.config.provider,
        analysisModel: this.config.model,
      };
    } catch (error) {
      console.error('Email analysis failed:', error);
      throw new Error(`Email analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the analysis prompt for the AI model
   */
  private buildAnalysisPrompt(request: EmailAnalysisRequest): string {
    const emailBody = request.htmlBody || request.textBody || '';
    const attachmentInfo = request.hasAttachments 
      ? `\n\nAttachments: ${request.attachmentTypes?.join(', ') || 'Yes'}`
      : '';

    return `Analyze the following email for a law firm case management system. Extract key information and classify the email's intent and urgency.

Email Details:
Subject: ${request.subject}
From: ${request.fromName || ''} <${request.fromEmail}>
Received: ${request.receivedAt}
${attachmentInfo}

Email Body:
${emailBody}

Please analyze this email and provide a response in the following JSON format:

{
  "summary": "2-3 sentence summary of the email content",
  "intent": "one of: new_case_inquiry, case_update, document_request, payment_inquiry, scheduling_request, complaint, question, follow_up, response, forwarded_info, other",
  "urgencyLevel": "one of: low, medium, high, urgent",
  "topicClassification": ["array", "of", "relevant", "topics"],
  "extractedEntities": {
    "names": ["person names mentioned"],
    "organizations": ["company/organization names"],
    "amounts": [{"value": 1000, "currency": "USD", "context": "legal fee"}],
    "dates": [{"date": "2024-01-15", "context": "court hearing"}],
    "caseNumbers": ["extracted case numbers"],
    "legalTerms": ["legal terminology used"],
    "locations": ["addresses, cities, states"],
    "phoneNumbers": ["phone numbers mentioned"],
    "emailAddresses": ["email addresses mentioned"]
  },
  "detectedLanguage": "ISO language code (e.g., 'en', 'es')",
  "confidenceScore": 85
}

Guidelines:
- Be precise and concise in the summary
- Focus on legally relevant information
- Extract all monetary amounts with context
- Include all dates with their significance
- Identify case numbers in various formats (e.g., "Case #12345", "Matter 2024-001", etc.)
- Classify urgency based on language, deadlines, and content
- Rate confidence from 0-100 based on clarity and completeness of the email
- Only extract entities that are clearly mentioned in the email
- For legal terms, focus on substantive legal concepts, not common words

Return only the JSON response, no additional text.`;
  }

  /**
   * Call the configured AI provider
   */
  private async callAIProvider(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(prompt);
      case 'anthropic':
        return this.callAnthropic(prompt);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert email analyzer for a law firm case management system. Analyze emails to extract relevant information and classify their intent and urgency.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 2000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.1,
        system: 'You are an expert email analyzer for a law firm case management system. Analyze emails to extract relevant information and classify their intent and urgency. Always respond with valid JSON.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  /**
   * Parse and validate the AI response
   */
  private parseAnalysisResponse(response: string): Omit<EmailAnalysisResult, 'processingTimeMs' | 'analysisProvider' | 'analysisModel'> {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.summary || !parsed.intent || !parsed.urgencyLevel) {
        throw new Error('Missing required analysis fields');
      }

      // Validate intent
      const validIntents: EmailIntent[] = [
        'new_case_inquiry', 'case_update', 'document_request', 'payment_inquiry',
        'scheduling_request', 'complaint', 'question', 'follow_up', 'response',
        'forwarded_info', 'other'
      ];
      if (!validIntents.includes(parsed.intent)) {
        parsed.intent = 'other';
      }

      // Validate urgency level
      const validUrgencyLevels: UrgencyLevel[] = ['low', 'medium', 'high', 'urgent'];
      if (!validUrgencyLevels.includes(parsed.urgencyLevel)) {
        parsed.urgencyLevel = 'medium';
      }

      // Ensure extracted entities structure
      const defaultEntities: ExtractedEntities = {
        names: [],
        organizations: [],
        amounts: [],
        dates: [],
        caseNumbers: [],
        legalTerms: [],
        locations: [],
        phoneNumbers: [],
        emailAddresses: []
      };

      const extractedEntities = { ...defaultEntities, ...parsed.extractedEntities };

      // Validate entity arrays
      Object.keys(extractedEntities).forEach(key => {
        if (!Array.isArray(extractedEntities[key as keyof ExtractedEntities])) {
          extractedEntities[key as keyof ExtractedEntities] = [] as any;
        }
      });

      return {
        summary: parsed.summary,
        intent: parsed.intent,
        urgencyLevel: parsed.urgencyLevel,
        topicClassification: Array.isArray(parsed.topicClassification) ? parsed.topicClassification : [],
        extractedEntities,
        detectedLanguage: parsed.detectedLanguage || 'en',
        confidenceScore: Math.max(0, Math.min(100, parsed.confidenceScore || 50)),
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Batch analyze multiple emails
   */
  async analyzeEmailBatch(requests: EmailAnalysisRequest[]): Promise<EmailAnalysisResult[]> {
    const results: EmailAnalysisResult[] = [];
    
    // Process in batches of 5 to avoid API rate limits
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.analyzeEmail(request));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch analysis failed for emails ${i}-${i + batchSize - 1}:`, error);
        // Add error results for failed batch
        batch.forEach(request => {
          results.push({
            summary: 'Analysis failed',
            intent: 'other',
            urgencyLevel: 'medium',
            topicClassification: [],
            extractedEntities: {
              names: [], organizations: [], amounts: [], dates: [], caseNumbers: [],
              legalTerms: [], locations: [], phoneNumbers: [], emailAddresses: []
            },
            detectedLanguage: 'en',
            confidenceScore: 0,
            processingTimeMs: 0,
            analysisProvider: this.config.provider,
            analysisModel: this.config.model,
          });
        });
      }

      // Add delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

/**
 * Factory function to create an EmailAnalyzer with default configuration
 */
export function createEmailAnalyzer(config?: Partial<AIProviderConfig>): EmailAnalyzer {
  const defaultConfig: AIProviderConfig = {
    provider: 'openai',
    model: 'gpt-4-0125-preview',
    temperature: 0.1,
    maxTokens: 2000,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Get API key from environment if not provided
  if (!finalConfig.apiKey) {
    if (finalConfig.provider === 'openai') {
      finalConfig.apiKey = process.env.OPENAI_API_KEY;
    } else if (finalConfig.provider === 'anthropic') {
      finalConfig.apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }

  return new EmailAnalyzer(finalConfig);
}

/**
 * Utility function to extract case numbers from text using patterns
 */
export function extractCaseNumbersFromText(text: string): string[] {
  const patterns = [
    /\b(?:case|matter|file)[\s#:]*([a-zA-Z0-9\-]{3,20})/gi,
    /\b([0-9]{2,4}[-_][0-9]{3,6})\b/g,
    /\b([A-Z]{2,4}[-_][0-9]{3,8})\b/g,
    /#([a-zA-Z0-9\-]{3,15})/g
  ];

  const caseNumbers: string[] = [];
  
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const caseNumber = match[1]?.trim();
      if (caseNumber && !caseNumbers.includes(caseNumber)) {
        caseNumbers.push(caseNumber);
      }
    }
  });

  return caseNumbers;
}

/**
 * Utility function to detect urgency indicators in email content
 */
export function detectUrgencyIndicators(subject: string, body: string): UrgencyLevel {
  const urgentKeywords = [
    'urgent', 'asap', 'emergency', 'immediate', 'critical', 'deadline today',
    'court tomorrow', 'filing due', 'needs attention now'
  ];
  
  const highKeywords = [
    'deadline', 'due date', 'time sensitive', 'priority', 'important',
    'court date', 'hearing', 'motion due', 'response needed'
  ];

  const content = `${subject} ${body}`.toLowerCase();

  if (urgentKeywords.some(keyword => content.includes(keyword))) {
    return 'urgent';
  }

  if (highKeywords.some(keyword => content.includes(keyword))) {
    return 'high';
  }

  // Check for dates in near future
  const datePattern = /\b(?:due|deadline|court|hearing).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi;
  const matches = content.matchAll(datePattern);
  
  for (const match of matches) {
    const dateStr = match[1];
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) return 'urgent';
      if (diffDays <= 7) return 'high';
    } catch (error) {
      // Invalid date, continue
    }
  }

  return 'medium';
}