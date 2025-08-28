'use client';

import { useState, useEffect, useCallback } from 'react';
import { CaseSearchResult } from '@/components/email/CaseAssignmentModal';

interface CaseAssignmentRecord {
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  assignedAt: Date;
  emailCount: number;
}

interface SearchHistoryEntry {
  query: string;
  timestamp: Date;
  resultCount: number;
  selectedCaseId?: string;
}

interface CaseUsageStats {
  caseId: string;
  assignmentCount: number;
  lastAssigned: Date;
  searchCount: number;
}

export interface CaseSearchHistoryData {
  recentSearches: SearchHistoryEntry[];
  recentAssignments: CaseAssignmentRecord[];
  frequentCases: CaseUsageStats[];
  searchPatterns: {
    commonQueries: string[];
    popularFilters: Record<string, number>;
    peakUsageTimes: number[]; // hours of day
  };
}

const STORAGE_KEYS = {
  RECENT_SEARCHES: 'case_search_recent_searches',
  RECENT_ASSIGNMENTS: 'case_search_recent_assignments',
  CASE_USAGE_STATS: 'case_search_usage_stats',
  SEARCH_PATTERNS: 'case_search_patterns'
};

const MAX_ENTRIES = {
  RECENT_SEARCHES: 20,
  RECENT_ASSIGNMENTS: 15,
  FREQUENT_CASES: 10
};

export function useCaseSearchHistory() {
  const [historyData, setHistoryData] = useState<CaseSearchHistoryData>({
    recentSearches: [],
    recentAssignments: [],
    frequentCases: [],
    searchPatterns: {
      commonQueries: [],
      popularFilters: {},
      peakUsageTimes: []
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = useCallback(() => {
    try {
      const recentSearches = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]'
      ).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));

      const recentAssignments = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.RECENT_ASSIGNMENTS) || '[]'
      ).map((entry: any) => ({
        ...entry,
        assignedAt: new Date(entry.assignedAt)
      }));

      const caseUsageStats = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CASE_USAGE_STATS) || '[]'
      ).map((entry: any) => ({
        ...entry,
        lastAssigned: new Date(entry.lastAssigned)
      }));

      const searchPatterns = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SEARCH_PATTERNS) || 
        '{"commonQueries":[],"popularFilters":{},"peakUsageTimes":[]}'
      );

      setHistoryData({
        recentSearches: recentSearches.slice(0, MAX_ENTRIES.RECENT_SEARCHES),
        recentAssignments: recentAssignments.slice(0, MAX_ENTRIES.RECENT_ASSIGNMENTS),
        frequentCases: caseUsageStats
          .sort((a: CaseUsageStats, b: CaseUsageStats) => b.assignmentCount - a.assignmentCount)
          .slice(0, MAX_ENTRIES.FREQUENT_CASES),
        searchPatterns
      });
    } catch (error) {
      console.error('Error loading search history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  // Record a search query
  const recordSearch = useCallback((
    query: string, 
    resultCount: number, 
    selectedCaseId?: string,
    appliedFilters?: Record<string, any>
  ) => {
    if (!query || query.trim().length < 2) return;

    setHistoryData(prev => {
      const newSearch: SearchHistoryEntry = {
        query: query.trim(),
        timestamp: new Date(),
        resultCount,
        selectedCaseId
      };

      // Remove duplicate queries and add new one at the beginning
      const updatedSearches = [
        newSearch,
        ...prev.recentSearches.filter(search => search.query !== query.trim())
      ].slice(0, MAX_ENTRIES.RECENT_SEARCHES);

      // Update search patterns
      const updatedPatterns = {
        ...prev.searchPatterns,
        commonQueries: updateCommonQueries(prev.searchPatterns.commonQueries, query.trim()),
        popularFilters: updatePopularFilters(prev.searchPatterns.popularFilters, appliedFilters || {}),
        peakUsageTimes: updatePeakUsageTimes(prev.searchPatterns.peakUsageTimes)
      };

      const newHistoryData = {
        ...prev,
        recentSearches: updatedSearches,
        searchPatterns: updatedPatterns
      };

      // Save to localStorage
      saveToStorage(STORAGE_KEYS.RECENT_SEARCHES, updatedSearches);
      saveToStorage(STORAGE_KEYS.SEARCH_PATTERNS, updatedPatterns);

      return newHistoryData;
    });
  }, [saveToStorage]);

  // Record a case assignment
  const recordCaseAssignment = useCallback((
    selectedCase: CaseSearchResult,
    searchQuery?: string
  ) => {
    setHistoryData(prev => {
      const newAssignment: CaseAssignmentRecord = {
        caseId: selectedCase.id,
        caseNumber: selectedCase.caseNumber,
        caseTitle: selectedCase.title,
        clientName: selectedCase.clientName,
        assignedAt: new Date(),
        emailCount: selectedCase.emailCount || 0
      };

      // Update recent assignments
      const updatedAssignments = [
        newAssignment,
        ...prev.recentAssignments.filter(assignment => assignment.caseId !== selectedCase.id)
      ].slice(0, MAX_ENTRIES.RECENT_ASSIGNMENTS);

      // Update case usage statistics
      const existingStatsIndex = prev.frequentCases.findIndex(
        stats => stats.caseId === selectedCase.id
      );

      let updatedFrequentCases: CaseUsageStats[];
      if (existingStatsIndex >= 0) {
        updatedFrequentCases = [...prev.frequentCases];
        updatedFrequentCases[existingStatsIndex] = {
          ...updatedFrequentCases[existingStatsIndex],
          assignmentCount: updatedFrequentCases[existingStatsIndex].assignmentCount + 1,
          lastAssigned: new Date(),
          searchCount: searchQuery ? updatedFrequentCases[existingStatsIndex].searchCount + 1 
                                   : updatedFrequentCases[existingStatsIndex].searchCount
        };
      } else {
        const newStats: CaseUsageStats = {
          caseId: selectedCase.id,
          assignmentCount: 1,
          lastAssigned: new Date(),
          searchCount: searchQuery ? 1 : 0
        };
        updatedFrequentCases = [...prev.frequentCases, newStats];
      }

      // Sort by assignment count and take top entries
      updatedFrequentCases = updatedFrequentCases
        .sort((a, b) => b.assignmentCount - a.assignmentCount)
        .slice(0, MAX_ENTRIES.FREQUENT_CASES);

      const newHistoryData = {
        ...prev,
        recentAssignments: updatedAssignments,
        frequentCases: updatedFrequentCases
      };

      // Save to localStorage
      saveToStorage(STORAGE_KEYS.RECENT_ASSIGNMENTS, updatedAssignments);
      saveToStorage(STORAGE_KEYS.CASE_USAGE_STATS, updatedFrequentCases);

      return newHistoryData;
    });
  }, [saveToStorage]);

  // Get recent cases for quick access
  const getRecentCases = useCallback((limit = 5) => {
    return historyData.recentAssignments.slice(0, limit);
  }, [historyData.recentAssignments]);

  // Get frequent cases for quick access
  const getFrequentCases = useCallback((limit = 5) => {
    return historyData.frequentCases.slice(0, limit);
  }, [historyData.frequentCases]);

  // Get search suggestions based on history
  const getSearchSuggestions = useCallback((currentQuery = '', limit = 5) => {
    const suggestions: string[] = [];

    // Add exact matches from recent searches
    historyData.recentSearches.forEach(search => {
      if (search.query.toLowerCase().includes(currentQuery.toLowerCase()) && 
          !suggestions.includes(search.query)) {
        suggestions.push(search.query);
      }
    });

    // Add common queries if not enough suggestions
    if (suggestions.length < limit) {
      historyData.searchPatterns.commonQueries.forEach(query => {
        if (query.toLowerCase().includes(currentQuery.toLowerCase()) && 
            !suggestions.includes(query) && 
            suggestions.length < limit) {
          suggestions.push(query);
        }
      });
    }

    return suggestions.slice(0, limit);
  }, [historyData.recentSearches, historyData.searchPatterns.commonQueries]);

  // Clear all history
  const clearHistory = useCallback(() => {
    const emptyHistory: CaseSearchHistoryData = {
      recentSearches: [],
      recentAssignments: [],
      frequentCases: [],
      searchPatterns: {
        commonQueries: [],
        popularFilters: {},
        peakUsageTimes: []
      }
    };

    setHistoryData(emptyHistory);

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  // Get usage analytics
  const getUsageAnalytics = useCallback(() => {
    const totalSearches = historyData.recentSearches.length;
    const totalAssignments = historyData.recentAssignments.length;
    const avgResultsPerSearch = totalSearches > 0 
      ? historyData.recentSearches.reduce((sum, search) => sum + search.resultCount, 0) / totalSearches 
      : 0;

    return {
      totalSearches,
      totalAssignments,
      avgResultsPerSearch: Math.round(avgResultsPerSearch * 10) / 10,
      mostUsedCase: historyData.frequentCases[0],
      peakUsageHour: getMostCommonHour(historyData.searchPatterns.peakUsageTimes),
      searchSuccessRate: totalAssignments / Math.max(totalSearches, 1)
    };
  }, [historyData]);

  return {
    historyData,
    isLoading,
    recordSearch,
    recordCaseAssignment,
    getRecentCases,
    getFrequentCases,
    getSearchSuggestions,
    clearHistory,
    getUsageAnalytics,
    refresh: loadHistoryData
  };
}

// Helper functions
function updateCommonQueries(currentQueries: string[], newQuery: string): string[] {
  const updated = [newQuery, ...currentQueries.filter(q => q !== newQuery)];
  return updated.slice(0, 10); // Keep top 10 common queries
}

function updatePopularFilters(
  currentFilters: Record<string, number>, 
  appliedFilters: Record<string, any>
): Record<string, number> {
  const updated = { ...currentFilters };
  
  Object.entries(appliedFilters).forEach(([key, value]) => {
    if (value && value !== 'all' && value !== '') {
      const filterKey = `${key}:${value}`;
      updated[filterKey] = (updated[filterKey] || 0) + 1;
    }
  });
  
  return updated;
}

function updatePeakUsageTimes(currentTimes: number[]): number[] {
  const currentHour = new Date().getHours();
  const updated = [...currentTimes, currentHour];
  
  // Keep only last 100 usage times to prevent unlimited growth
  return updated.slice(-100);
}

function getMostCommonHour(usageTimes: number[]): number | null {
  if (usageTimes.length === 0) return null;
  
  const hourCounts: Record<number, number> = {};
  usageTimes.forEach(hour => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  return parseInt(
    Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '0'
  );
}