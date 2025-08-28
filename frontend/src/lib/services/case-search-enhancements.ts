'use client';

import { CaseSearchResult } from '@/components/email/CaseAssignmentModal';

// Enhanced search parameters interface
export interface EnhancedSearchParams {
  q: string;
  limit?: number;
  offset?: number;
  case_type_id?: string;
  status?: string;
  filter?: 'active' | 'my_cases' | 'recent' | 'frequent';
  date_range?: '30days' | '3months' | '6months' | 'year' | 'all';
  client_domain?: string;
  assigned_attorney_id?: string;
  sort_by?: 'relevance' | 'date' | 'case_number' | 'client_name';
}

export interface SearchResponse {
  cases: CaseSearchResult[];
  totalCount: number;
  query: string;
  appliedFilters: Record<string, any>;
  hasMore: boolean;
  searchTime?: number;
}

export interface SearchSuggestion {
  type: 'recent' | 'frequent' | 'domain_match' | 'keyword';
  text: string;
  description: string;
  filters?: Partial<EnhancedSearchParams>;
}

export class CaseSearchEnhancementService {
  private baseUrl = '/api/cases/search';
  private searchHistory: string[] = [];
  private maxHistoryLength = 10;

  /**
   * Enhanced case search with improved filtering and ranking
   */
  async searchCases(params: EnhancedSearchParams): Promise<SearchResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      // Add all parameters to URL
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Search failed`);
      }

      const data = await response.json();
      
      // Record search in history if it has meaningful query
      if (params.q && params.q.length >= 2) {
        this.addToHistory(params.q);
      }

      return data;
    } catch (error) {
      console.error('Enhanced case search failed:', error);
      throw error;
    }
  }

  /**
   * Get smart search suggestions based on email content
   */
  getEmailBasedSuggestions(emailContent: {
    subject?: string;
    fromName?: string;
    fromEmail?: string;
    body?: string;
  }): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // Extract domain from email
    if (emailContent.fromEmail) {
      const domain = emailContent.fromEmail.split('@')[1];
      if (domain) {
        suggestions.push({
          type: 'domain_match',
          text: `Cases from ${domain}`,
          description: `Find cases with clients from ${domain}`,
          filters: { client_domain: domain }
        });
      }
    }

    // Extract potential case numbers from subject
    if (emailContent.subject) {
      const caseNumberMatch = emailContent.subject.match(/\b(\d{4}[-_]\d+|\w+[-_]\d{4}[-_]\d+)\b/);
      if (caseNumberMatch) {
        suggestions.push({
          type: 'keyword',
          text: caseNumberMatch[1],
          description: 'Potential case number found in subject',
          filters: { q: caseNumberMatch[1] }
        });
      }

      // Extract company/organization names (capitalized words)
      const orgMatch = emailContent.subject.match(/\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s+(?:Inc|LLC|Corp|Ltd|Co))?)\b/);
      if (orgMatch) {
        suggestions.push({
          type: 'keyword',
          text: orgMatch[1],
          description: 'Organization name found in subject',
          filters: { q: orgMatch[1] }
        });
      }
    }

    // Extract names from sender
    if (emailContent.fromName && emailContent.fromName !== emailContent.fromEmail) {
      const names = emailContent.fromName.split(' ').filter(name => 
        name.length > 2 && /^[A-Z][a-z]+$/.test(name)
      );
      if (names.length >= 2) {
        suggestions.push({
          type: 'keyword',
          text: names.slice(0, 2).join(' '),
          description: 'Contact name found in email',
          filters: { q: names.slice(0, 2).join(' ') }
        });
      }
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Get quick filter suggestions
   */
  getQuickFilters(): SearchSuggestion[] {
    return [
      {
        type: 'recent',
        text: 'Recent Cases',
        description: 'Cases updated in the last 30 days',
        filters: { filter: 'recent' }
      },
      {
        type: 'frequent',
        text: 'My Cases',
        description: 'Cases I am assigned to',
        filters: { filter: 'my_cases' }
      },
      {
        type: 'frequent',
        text: 'Active Cases',
        description: 'Only active cases',
        filters: { filter: 'active' }
      },
      {
        type: 'frequent',
        text: 'Frequent Cases',
        description: 'Cases I assign emails to often',
        filters: { filter: 'frequent' }
      }
    ];
  }

  /**
   * Generate search query from multiple criteria
   */
  buildSearchQuery(criteria: {
    clientName?: string;
    caseNumber?: string;
    subject?: string;
    organization?: string;
  }): string {
    const parts: string[] = [];

    if (criteria.caseNumber) parts.push(criteria.caseNumber);
    if (criteria.clientName) parts.push(criteria.clientName);
    if (criteria.organization) parts.push(criteria.organization);
    if (criteria.subject) {
      // Extract meaningful words from subject (ignore common words)
      const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 're:']);
      const words = criteria.subject.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
        .slice(0, 3); // Take first 3 meaningful words
      parts.push(...words);
    }

    return parts.join(' ').trim();
  }

  /**
   * Add search term to history
   */
  private addToHistory(query: string) {
    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item !== query);
    
    // Add to beginning
    this.searchHistory.unshift(query);
    
    // Limit history length
    if (this.searchHistory.length > this.maxHistoryLength) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistoryLength);
    }
  }

  /**
   * Get search history for suggestions
   */
  getSearchHistory(): SearchSuggestion[] {
    return this.searchHistory.map(query => ({
      type: 'recent',
      text: query,
      description: 'Recent search',
      filters: { q: query }
    }));
  }

  /**
   * Extract client domain from email address
   */
  extractClientDomain(emailAddress: string): string | null {
    if (!emailAddress || !emailAddress.includes('@')) return null;
    
    const domain = emailAddress.split('@')[1];
    
    // Filter out common email providers
    const commonProviders = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ]);
    
    return commonProviders.has(domain.toLowerCase()) ? null : domain;
  }

  /**
   * Suggest search refinements based on current results
   */
  suggestRefinements(
    currentQuery: string, 
    currentResults: CaseSearchResult[], 
    currentFilters: Partial<EnhancedSearchParams>
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // If too many results, suggest narrowing
    if (currentResults.length > 10) {
      if (!currentFilters.filter) {
        suggestions.push({
          type: 'recent',
          text: 'Active cases only',
          description: 'Filter to active cases',
          filters: { ...currentFilters, filter: 'active' }
        });
      }

      if (!currentFilters.date_range || currentFilters.date_range === 'all') {
        suggestions.push({
          type: 'recent',
          text: 'Recent cases (30 days)',
          description: 'Show only recently updated cases',
          filters: { ...currentFilters, date_range: '30days' }
        });
      }
    }

    // If no results, suggest broadening
    if (currentResults.length === 0 && currentQuery.length > 0) {
      suggestions.push({
        type: 'keyword',
        text: 'All cases',
        description: 'Remove search query to see all cases',
        filters: { ...currentFilters, q: '' }
      });

      if (currentFilters.date_range !== 'all') {
        suggestions.push({
          type: 'keyword',
          text: 'All time periods',
          description: 'Remove date restriction',
          filters: { ...currentFilters, date_range: 'all' }
        });
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Format case for display with highlighting
   */
  formatCaseForDisplay(
    caseItem: CaseSearchResult, 
    searchQuery: string
  ): CaseSearchResult & { highlightedFields: Record<string, string> } {
    const highlightedFields: Record<string, string> = {};

    if (searchQuery && searchQuery.length > 1) {
      const query = searchQuery.toLowerCase();
      
      // Highlight matched text
      if (caseItem.caseNumber.toLowerCase().includes(query)) {
        highlightedFields.caseNumber = this.highlightText(caseItem.caseNumber, searchQuery);
      }
      
      if (caseItem.title.toLowerCase().includes(query)) {
        highlightedFields.title = this.highlightText(caseItem.title, searchQuery);
      }
      
      if (caseItem.clientName.toLowerCase().includes(query)) {
        highlightedFields.clientName = this.highlightText(caseItem.clientName, searchQuery);
      }
      
      if (caseItem.clientOrganization?.toLowerCase().includes(query)) {
        highlightedFields.clientOrganization = this.highlightText(caseItem.clientOrganization, searchQuery);
      }
    }

    return { ...caseItem, highlightedFields };
  }

  /**
   * Highlight search terms in text
   */
  private highlightText(text: string, searchQuery: string): string {
    if (!searchQuery || searchQuery.length < 2) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Clear search history
   */
  clearHistory() {
    this.searchHistory = [];
  }
}

// Export singleton instance
export const caseSearchService = new CaseSearchEnhancementService();