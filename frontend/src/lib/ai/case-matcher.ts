/**
 * AI-powered case matching service
 * Intelligently matches emails to existing cases based on content analysis
 */

import { EmailAnalysisResult, ExtractedEntities } from './email-analyzer';

export interface CaseMatchRequest {
  emailAnalysis: EmailAnalysisResult;
  emailMetadata: {
    emailId: string;
    subject: string;
    fromEmail: string;
    fromName?: string;
    receivedAt: string;
  };
  availableCases: CaseForMatching[];
  userContext?: UserAssignmentContext;
}

export interface CaseForMatching {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  status: string;
  practiceArea?: string;
  assignedAttorneys?: string[];
  lastActivity?: string;
  createdAt: string;
  
  // Additional matching fields
  clientEmails?: string[];
  relatedContacts?: string[];
  tags?: string[];
  keywords?: string[];
  description?: string;
}

export interface UserAssignmentContext {
  userId: string;
  recentAssignments: Array<{
    caseId: string;
    assignedAt: string;
    emailCount: number;
  }>;
  userPreferences?: {
    preferredPracticeAreas?: string[];
    defaultCases?: string[];
  };
}

export interface CaseSuggestion {
  caseId: string;
  confidenceScore: number;
  suggestionReason: SuggestionReason;
  matchCriteria: MatchCriteria;
  explanation: string;
  rank: number;
}

export type SuggestionReason = 
  | 'content_analysis'
  | 'client_match'
  | 'case_number_match'
  | 'pattern_match'
  | 'recent_activity'
  | 'contact_match'
  | 'subject_similarity'
  | 'entity_match';

export interface MatchCriteria {
  matchType: SuggestionReason;
  matchedFields: string[];
  matchedValues: string[];
  similarityScore?: number;
  additionalContext?: Record<string, any>;
}

export interface CaseMatchResult {
  suggestions: CaseSuggestion[];
  processingTimeMs: number;
  algorithmVersion: string;
  totalCasesEvaluated: number;
}

/**
 * Case matcher class that provides intelligent case suggestions
 */
export class CaseMatcher {
  private algorithmVersion = '1.0';

  /**
   * Find the best matching cases for an email
   */
  async findMatchingCases(request: CaseMatchRequest): Promise<CaseMatchResult> {
    const startTime = Date.now();
    
    try {
      const suggestions = await this.generateSuggestions(request);
      const rankedSuggestions = this.rankSuggestions(suggestions);
      
      return {
        suggestions: rankedSuggestions.slice(0, 5), // Top 5 suggestions
        processingTimeMs: Date.now() - startTime,
        algorithmVersion: this.algorithmVersion,
        totalCasesEvaluated: request.availableCases.length
      };
    } catch (error) {
      console.error('Case matching failed:', error);
      throw new Error(`Case matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate case suggestions using multiple strategies
   */
  private async generateSuggestions(request: CaseMatchRequest): Promise<CaseSuggestion[]> {
    const suggestions: CaseSuggestion[] = [];

    // Strategy 1: Direct case number match
    suggestions.push(...this.findCaseNumberMatches(request));

    // Strategy 2: Client/contact matching
    suggestions.push(...this.findClientMatches(request));

    // Strategy 3: Content similarity analysis
    suggestions.push(...await this.findContentMatches(request));

    // Strategy 4: Pattern-based matching (recent activity)
    suggestions.push(...this.findPatternMatches(request));

    // Strategy 5: Entity-based matching
    suggestions.push(...this.findEntityMatches(request));

    // Strategy 6: Subject line similarity
    suggestions.push(...this.findSubjectMatches(request));

    return suggestions;
  }

  /**
   * Find cases by direct case number references
   */
  private findCaseNumberMatches(request: CaseMatchRequest): CaseSuggestion[] {
    const suggestions: CaseSuggestion[] = [];
    const caseNumbers = request.emailAnalysis.extractedEntities.caseNumbers;

    if (caseNumbers.length === 0) return suggestions;

    for (const availableCase of request.availableCases) {
      for (const extractedNumber of caseNumbers) {
        if (this.normalizeString(availableCase.caseNumber).includes(this.normalizeString(extractedNumber)) ||
            this.normalizeString(extractedNumber).includes(this.normalizeString(availableCase.caseNumber))) {
          
          suggestions.push({
            caseId: availableCase.id,
            confidenceScore: 95,
            suggestionReason: 'case_number_match',
            matchCriteria: {
              matchType: 'case_number_match',
              matchedFields: ['caseNumber'],
              matchedValues: [extractedNumber, availableCase.caseNumber],
            },
            explanation: `Case number "${extractedNumber}" matches case "${availableCase.caseNumber}"`,
            rank: 1
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Find cases by client name or email matching
   */
  private findClientMatches(request: CaseMatchRequest): CaseSuggestion[] {
    const suggestions: CaseSuggestion[] = [];
    const fromEmail = request.emailMetadata.fromEmail.toLowerCase();
    const fromName = request.emailMetadata.fromName?.toLowerCase() || '';
    const extractedNames = request.emailAnalysis.extractedEntities.names.map(n => n.toLowerCase());

    for (const availableCase of request.availableCases) {
      const clientName = availableCase.clientName.toLowerCase();
      const clientEmails = availableCase.clientEmails?.map(e => e.toLowerCase()) || [];
      
      let matchType: 'exact_email' | 'name_similarity' | 'extracted_name' | null = null;
      let matchedValue = '';
      let confidenceScore = 0;

      // Check for exact email match
      if (clientEmails.includes(fromEmail)) {
        matchType = 'exact_email';
        matchedValue = fromEmail;
        confidenceScore = 90;
      }
      // Check for name similarity
      else if (fromName && this.calculateStringSimilarity(fromName, clientName) > 0.8) {
        matchType = 'name_similarity';
        matchedValue = fromName;
        confidenceScore = 85;
      }
      // Check extracted names
      else {
        for (const extractedName of extractedNames) {
          if (this.calculateStringSimilarity(extractedName, clientName) > 0.7) {
            matchType = 'extracted_name';
            matchedValue = extractedName;
            confidenceScore = 75;
            break;
          }
        }
      }

      if (matchType) {
        suggestions.push({
          caseId: availableCase.id,
          confidenceScore,
          suggestionReason: 'client_match',
          matchCriteria: {
            matchType: 'client_match',
            matchedFields: ['clientName', 'fromEmail'],
            matchedValues: [matchedValue, availableCase.clientName],
            additionalContext: { matchType }
          },
          explanation: `Client match: ${matchedValue} matches ${availableCase.clientName}`,
          rank: 2
        });
      }
    }

    return suggestions;
  }

  /**
   * Find cases by content similarity analysis
   */
  private async findContentMatches(request: CaseMatchRequest): Promise<CaseSuggestion[]> {
    const suggestions: CaseSuggestion[] = [];
    const emailTopics = request.emailAnalysis.topicClassification;
    const emailSummary = request.emailAnalysis.summary.toLowerCase();

    for (const availableCase of request.availableCases) {
      let totalScore = 0;
      let matchedCriteria: string[] = [];

      // Practice area matching
      if (availableCase.practiceArea) {
        const practiceAreaScore = this.calculateTopicSimilarity(
          emailTopics, 
          [availableCase.practiceArea]
        );
        if (practiceAreaScore > 0.3) {
          totalScore += practiceAreaScore * 30;
          matchedCriteria.push('practiceArea');
        }
      }

      // Keywords matching
      if (availableCase.keywords) {
        const keywordScore = this.calculateTopicSimilarity(emailTopics, availableCase.keywords);
        if (keywordScore > 0.2) {
          totalScore += keywordScore * 25;
          matchedCriteria.push('keywords');
        }
      }

      // Case title and description similarity
      const titleSimilarity = this.calculateStringSimilarity(
        emailSummary, 
        availableCase.title.toLowerCase()
      );
      if (titleSimilarity > 0.3) {
        totalScore += titleSimilarity * 20;
        matchedCriteria.push('title');
      }

      if (availableCase.description) {
        const descSimilarity = this.calculateStringSimilarity(
          emailSummary, 
          availableCase.description.toLowerCase()
        );
        if (descSimilarity > 0.3) {
          totalScore += descSimilarity * 15;
          matchedCriteria.push('description');
        }
      }

      if (totalScore > 25 && matchedCriteria.length > 0) {
        suggestions.push({
          caseId: availableCase.id,
          confidenceScore: Math.min(totalScore, 85),
          suggestionReason: 'content_analysis',
          matchCriteria: {
            matchType: 'content_analysis',
            matchedFields: matchedCriteria,
            matchedValues: emailTopics,
            similarityScore: totalScore
          },
          explanation: `Content similarity based on ${matchedCriteria.join(', ')}`,
          rank: 3
        });
      }
    }

    return suggestions;
  }

  /**
   * Find cases based on user assignment patterns
   */
  private findPatternMatches(request: CaseMatchRequest): CaseSuggestion[] {
    const suggestions: CaseSuggestion[] = [];
    
    if (!request.userContext?.recentAssignments) return suggestions;

    // Get cases with recent activity
    const recentCaseIds = request.userContext.recentAssignments
      .filter(assignment => {
        const daysSince = (Date.now() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30; // Within last 30 days
      })
      .sort((a, b) => b.emailCount - a.emailCount) // Sort by email count
      .slice(0, 3) // Top 3 most active cases
      .map(assignment => assignment.caseId);

    for (const availableCase of request.availableCases) {
      if (recentCaseIds.includes(availableCase.id)) {
        const recentAssignment = request.userContext.recentAssignments
          .find(a => a.caseId === availableCase.id);
        
        if (recentAssignment) {
          const confidenceScore = Math.min(70, 40 + recentAssignment.emailCount * 5);
          
          suggestions.push({
            caseId: availableCase.id,
            confidenceScore,
            suggestionReason: 'pattern_match',
            matchCriteria: {
              matchType: 'pattern_match',
              matchedFields: ['recentActivity'],
              matchedValues: [recentAssignment.assignedAt],
              additionalContext: { 
                emailCount: recentAssignment.emailCount,
                daysSince: Math.floor((Date.now() - new Date(recentAssignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24))
              }
            },
            explanation: `Recently active case (${recentAssignment.emailCount} emails assigned)`,
            rank: 4
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Find cases by matching extracted entities
   */
  private findEntityMatches(request: CaseMatchRequest): CaseSuggestion[] {
    const suggestions: CaseSuggestion[] = [];
    const entities = request.emailAnalysis.extractedEntities;

    for (const availableCase of request.availableCases) {
      let matchScore = 0;
      const matchedEntities: string[] = [];

      // Match organizations
      if (entities.organizations.length > 0 && availableCase.tags) {
        const orgMatches = entities.organizations.filter(org => 
          availableCase.tags?.some(tag => 
            this.normalizeString(tag).includes(this.normalizeString(org)) ||
            this.normalizeString(org).includes(this.normalizeString(tag))
          )
        );
        if (orgMatches.length > 0) {
          matchScore += orgMatches.length * 15;
          matchedEntities.push(...orgMatches);
        }
      }

      // Match legal terms
      if (entities.legalTerms.length > 0) {
        const legalMatches = entities.legalTerms.filter(term =>
          availableCase.description?.toLowerCase().includes(term.toLowerCase()) ||
          availableCase.title.toLowerCase().includes(term.toLowerCase())
        );
        if (legalMatches.length > 0) {
          matchScore += legalMatches.length * 10;
          matchedEntities.push(...legalMatches);
        }
      }

      // Match locations
      if (entities.locations.length > 0 && availableCase.keywords) {
        const locationMatches = entities.locations.filter(loc =>
          availableCase.keywords?.some(keyword =>
            keyword.toLowerCase().includes(loc.toLowerCase())
          )
        );
        if (locationMatches.length > 0) {
          matchScore += locationMatches.length * 5;
          matchedEntities.push(...locationMatches);
        }
      }

      if (matchScore > 20 && matchedEntities.length > 0) {
        suggestions.push({
          caseId: availableCase.id,
          confidenceScore: Math.min(matchScore, 75),
          suggestionReason: 'entity_match',
          matchCriteria: {
            matchType: 'entity_match',
            matchedFields: ['entities'],
            matchedValues: matchedEntities,
            additionalContext: { entityTypes: Object.keys(entities) }
          },
          explanation: `Matched entities: ${matchedEntities.slice(0, 3).join(', ')}`,
          rank: 5
        });
      }
    }

    return suggestions;
  }

  /**
   * Find cases by subject line similarity
   */
  private findSubjectMatches(request: CaseMatchRequest): CaseSuggestion[] {
    const suggestions: CaseSuggestion[] = [];
    const emailSubject = request.emailMetadata.subject.toLowerCase();

    for (const availableCase of request.availableCases) {
      const titleSimilarity = this.calculateStringSimilarity(
        emailSubject,
        availableCase.title.toLowerCase()
      );

      if (titleSimilarity > 0.6) {
        const confidenceScore = Math.floor(titleSimilarity * 70);
        
        suggestions.push({
          caseId: availableCase.id,
          confidenceScore,
          suggestionReason: 'subject_similarity',
          matchCriteria: {
            matchType: 'subject_similarity',
            matchedFields: ['subject', 'title'],
            matchedValues: [emailSubject, availableCase.title],
            similarityScore: titleSimilarity
          },
          explanation: `Subject similarity with case title`,
          rank: 6
        });
      }
    }

    return suggestions;
  }

  /**
   * Rank and deduplicate suggestions
   */
  private rankSuggestions(suggestions: CaseSuggestion[]): CaseSuggestion[] {
    // Group suggestions by case ID and keep the best one for each case
    const caseMap = new Map<string, CaseSuggestion>();

    for (const suggestion of suggestions) {
      const existing = caseMap.get(suggestion.caseId);
      
      if (!existing || suggestion.confidenceScore > existing.confidenceScore) {
        caseMap.set(suggestion.caseId, suggestion);
      }
    }

    // Sort by confidence score and rank
    const rankedSuggestions = Array.from(caseMap.values())
      .sort((a, b) => {
        // First by rank (lower is better)
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }
        // Then by confidence score (higher is better)
        return b.confidenceScore - a.confidenceScore;
      })
      .map((suggestion, index) => ({
        ...suggestion,
        rank: index + 1
      }));

    return rankedSuggestions;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix = Array.from({ length: s1.length + 1 }, () =>
      Array.from({ length: s2.length + 1 }, () => 0)
    );

    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    return 1 - matrix[s1.length][s2.length] / maxLength;
  }

  /**
   * Calculate topic similarity between arrays
   */
  private calculateTopicSimilarity(topics1: string[], topics2: string[]): number {
    if (topics1.length === 0 || topics2.length === 0) return 0;

    const normalized1 = topics1.map(t => this.normalizeString(t));
    const normalized2 = topics2.map(t => this.normalizeString(t));

    let matches = 0;
    for (const topic1 of normalized1) {
      for (const topic2 of normalized2) {
        if (topic1.includes(topic2) || topic2.includes(topic1) || 
            this.calculateStringSimilarity(topic1, topic2) > 0.7) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(topics1.length, topics2.length);
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  }
}

/**
 * Factory function to create a CaseMatcher instance
 */
export function createCaseMatcher(): CaseMatcher {
  return new CaseMatcher();
}

/**
 * Utility function to filter cases based on user permissions and preferences
 */
export function filterCasesForUser(
  cases: CaseForMatching[],
  userContext?: UserAssignmentContext
): CaseForMatching[] {
  if (!userContext?.userPreferences) return cases;

  const preferences = userContext.userPreferences;
  
  // Filter by preferred practice areas
  if (preferences.preferredPracticeAreas && preferences.preferredPracticeAreas.length > 0) {
    return cases.filter(caseItem => 
      !caseItem.practiceArea || 
      preferences.preferredPracticeAreas!.includes(caseItem.practiceArea)
    );
  }

  return cases;
}