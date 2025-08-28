/**
 * React hook for managing email case suggestions
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface EmailSuggestion {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  confidenceScore: number;
  suggestionReason: string;
  matchCriteria: any;
  rank: number;
  explanation: string;
  caseStatus: string;
  lastActivity?: string;
  assignedAttorneys?: string[];
  practiceArea?: string;
  confidenceLabel: 'high' | 'medium' | 'low';
  matchReasonDescription: string;
  actions: Array<{
    type: 'accept' | 'reject' | 'view_case' | 'similar_cases';
    label: string;
    description?: string;
    enabled: boolean;
  }>;
}

export interface EmailSuggestionsResponse {
  emailId: string;
  suggestions: EmailSuggestion[];
  emailSummary: string;
  emailIntent: string;
  urgencyLevel: string;
  processingTimeMs: number;
  fromCache: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface UseEmailSuggestionsOptions {
  emailId?: string;
  autoFetch?: boolean;
  onSuggestionsFetched?: (suggestions: EmailSuggestionsResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseEmailSuggestionsReturn {
  suggestions: EmailSuggestion[];
  emailAnalysis: {
    summary: string;
    intent: string;
    urgency: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  isLoading: boolean;
  error: string | null;
  processingTime: number;
  fromCache: boolean;
  
  // Actions
  fetchSuggestions: (emailId: string, forceReanalysis?: boolean) => Promise<void>;
  reanalyzeSuggestions: (emailId: string, emailContent: any) => Promise<void>;
  acceptSuggestion: (suggestionId: string, context?: any) => Promise<void>;
  rejectSuggestion: (suggestionId: string, feedback?: string) => Promise<void>;
  ignoreSuggestion: (suggestionId: string) => Promise<void>;
  refreshSuggestions: () => Promise<void>;
  clearSuggestions: () => void;
}

export function useEmailSuggestions(
  options: UseEmailSuggestionsOptions = {}
): UseEmailSuggestionsReturn {
  const { user } = useUser();
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [emailAnalysis, setEmailAnalysis] = useState<{
    summary: string;
    intent: string;
    urgency: string;
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [currentEmailId, setCurrentEmailId] = useState<string | null>(options.emailId || null);

  // Fetch suggestions for an email
  const fetchSuggestions = useCallback(async (emailId: string, forceReanalysis = false) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentEmailId(emailId);

    try {
      const url = `/api/emails/${emailId}/suggestions${forceReanalysis ? '?force=true' : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch suggestions');
      }

      const result = await response.json();
      const data: EmailSuggestionsResponse = result.data;

      setSuggestions(data.suggestions);
      setEmailAnalysis({
        summary: data.emailSummary,
        intent: data.emailIntent,
        urgency: data.urgencyLevel,
        confidence: data.confidence,
      });
      setProcessingTime(data.processingTimeMs);
      setFromCache(data.fromCache);

      options.onSuggestionsFetched?.(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [user, options]);

  // Reanalyze with new email content
  const reanalyzeSuggestions = useCallback(async (emailId: string, emailContent: any) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentEmailId(emailId);

    try {
      const response = await fetch(`/api/emails/${emailId}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reanalyze email');
      }

      const result = await response.json();
      const data: EmailSuggestionsResponse = result.data;

      setSuggestions(data.suggestions);
      setEmailAnalysis({
        summary: data.emailSummary,
        intent: data.emailIntent,
        urgency: data.urgencyLevel,
        confidence: data.confidence,
      });
      setProcessingTime(data.processingTimeMs);
      setFromCache(false); // Always false for reanalysis

      options.onSuggestionsFetched?.(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [user, options]);

  // Submit feedback on a suggestion
  const submitFeedback = useCallback(async (
    suggestionId: string, 
    action: 'accepted' | 'rejected' | 'ignored',
    context?: any
  ) => {
    try {
      const response = await fetch('/api/suggestions/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          action,
          context: {
            emailId: currentEmailId,
            ...context,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      // Update local state to reflect user action
      setSuggestions(prev => 
        prev.map(suggestion => 
          suggestion.id === suggestionId 
            ? { ...suggestion, userAction: action } 
            : suggestion
        )
      );
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      // Don't throw - feedback is optional
    }
  }, [currentEmailId]);

  // Accept a suggestion
  const acceptSuggestion = useCallback(async (suggestionId: string, context?: any) => {
    await submitFeedback(suggestionId, 'accepted', context);
  }, [submitFeedback]);

  // Reject a suggestion
  const rejectSuggestion = useCallback(async (suggestionId: string, feedback?: string) => {
    await submitFeedback(suggestionId, 'rejected', { feedback });
  }, [submitFeedback]);

  // Ignore a suggestion
  const ignoreSuggestion = useCallback(async (suggestionId: string) => {
    await submitFeedback(suggestionId, 'ignored');
  }, [submitFeedback]);

  // Refresh current suggestions
  const refreshSuggestions = useCallback(async () => {
    if (currentEmailId) {
      await fetchSuggestions(currentEmailId);
    }
  }, [currentEmailId, fetchSuggestions]);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setEmailAnalysis(null);
    setError(null);
    setProcessingTime(0);
    setFromCache(false);
    setCurrentEmailId(null);
  }, []);

  // Auto-fetch suggestions when emailId changes
  useEffect(() => {
    if (options.autoFetch && options.emailId && options.emailId !== currentEmailId) {
      fetchSuggestions(options.emailId);
    }
  }, [options.autoFetch, options.emailId, currentEmailId, fetchSuggestions]);

  return {
    suggestions,
    emailAnalysis,
    isLoading,
    error,
    processingTime,
    fromCache,
    fetchSuggestions,
    reanalyzeSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    ignoreSuggestion,
    refreshSuggestions,
    clearSuggestions,
  };
}

/**
 * Hook for bulk email suggestions
 */
export interface UseBulkSuggestionsOptions {
  onProgress?: (completed: number, total: number) => void;
  onError?: (emailId: string, error: Error) => void;
  batchSize?: number;
}

export interface UseBulkSuggestionsReturn {
  suggestions: Map<string, EmailSuggestionsResponse>;
  isLoading: boolean;
  progress: { completed: number; total: number };
  errors: Array<{ emailId: string; error: string }>;
  
  fetchBulkSuggestions: (emailIds: string[]) => Promise<void>;
  clearBulkSuggestions: () => void;
}

export function useBulkEmailSuggestions(
  options: UseBulkSuggestionsOptions = {}
): UseBulkSuggestionsReturn {
  const { user } = useUser();
  const [suggestions, setSuggestions] = useState<Map<string, EmailSuggestionsResponse>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [errors, setErrors] = useState<Array<{ emailId: string; error: string }>>([]);

  const fetchBulkSuggestions = useCallback(async (emailIds: string[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setProgress({ completed: 0, total: emailIds.length });
    setErrors([]);
    setSuggestions(new Map());

    const batchSize = options.batchSize || 3;
    const newSuggestions = new Map<string, EmailSuggestionsResponse>();
    const newErrors: Array<{ emailId: string; error: string }> = [];

    for (let i = 0; i < emailIds.length; i += batchSize) {
      const batch = emailIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (emailId) => {
        try {
          const response = await fetch(`/api/emails/${emailId}/suggestions`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch suggestions');
          }

          const result = await response.json();
          const data: EmailSuggestionsResponse = result.data;
          
          newSuggestions.set(emailId, data);
          return { emailId, success: true, data };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          newErrors.push({ emailId, error: errorMessage });
          options.onError?.(emailId, error instanceof Error ? error : new Error(errorMessage));
          return { emailId, success: false, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);
      
      const completed = i + batch.length;
      setProgress({ completed, total: emailIds.length });
      setSuggestions(new Map(newSuggestions));
      setErrors([...newErrors]);

      options.onProgress?.(completed, emailIds.length);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < emailIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsLoading(false);
  }, [user, options]);

  const clearBulkSuggestions = useCallback(() => {
    setSuggestions(new Map());
    setProgress({ completed: 0, total: 0 });
    setErrors([]);
  }, []);

  return {
    suggestions,
    isLoading,
    progress,
    errors,
    fetchBulkSuggestions,
    clearBulkSuggestions,
  };
}