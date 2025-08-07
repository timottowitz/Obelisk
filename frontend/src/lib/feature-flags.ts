/**
 * Feature flags configuration for the application
 * These can be controlled via environment variables or remote config
 */

interface FeatureFlags {
  aiSuggestions: boolean;
  aiSuggestionsAutoApply: boolean;
  aiSuggestionsBulkReview: boolean;
  aiSuggestionsRealtime: boolean;
  enhancedTaskManagement: boolean;
  advancedAnalytics: boolean;
  betaFeatures: boolean;
}

/**
 * Get feature flags from environment or defaults
 */
export function getFeatureFlags(): FeatureFlags {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Get flags from environment variables or localStorage overrides
  const flags: FeatureFlags = {
    aiSuggestions: getFlag('AI_SUGGESTIONS', true),
    aiSuggestionsAutoApply: getFlag('AI_SUGGESTIONS_AUTO_APPLY', false),
    aiSuggestionsBulkReview: getFlag('AI_SUGGESTIONS_BULK_REVIEW', true),
    aiSuggestionsRealtime: getFlag('AI_SUGGESTIONS_REALTIME', true),
    enhancedTaskManagement: getFlag('ENHANCED_TASK_MANAGEMENT', true),
    advancedAnalytics: getFlag('ADVANCED_ANALYTICS', false),
    betaFeatures: getFlag('BETA_FEATURES', false),
  };

  return flags;
}

/**
 * Helper to get a single flag value
 */
function getFlag(key: string, defaultValue: boolean): boolean {
  // Check environment variable
  const envKey = `NEXT_PUBLIC_FEATURE_${key}`;
  const envValue = process.env[envKey];
  
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  // Check localStorage override (dev mode)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const storageKey = `feature_flag_${key.toLowerCase()}`;
    const storageValue = localStorage.getItem(storageKey);
    
    if (storageValue !== null) {
      return storageValue === 'true';
    }
  }

  return defaultValue;
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeature(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Component wrapper for feature flags
 */
export function FeatureFlag({ 
  feature, 
  children,
  fallback = null 
}: { 
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeature(feature);
  
  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Override feature flags in development
 */
export function setFeatureFlag(feature: keyof FeatureFlags, enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Feature flag overrides only work in development mode');
    return;
  }

  const storageKey = `feature_flag_${feature.toLowerCase()}`;
  localStorage.setItem(storageKey, enabled.toString());
  
  // Trigger a page reload to apply changes
  window.location.reload();
}

/**
 * Get all feature flag overrides (dev mode)
 */
export function getFeatureFlagOverrides(): Partial<FeatureFlags> {
  if (typeof window === 'undefined') return {};
  if (process.env.NODE_ENV !== 'development') return {};

  const overrides: Partial<FeatureFlags> = {};
  const flags = Object.keys(getFeatureFlags()) as (keyof FeatureFlags)[];

  flags.forEach(flag => {
    const storageKey = `feature_flag_${flag.toLowerCase()}`;
    const value = localStorage.getItem(storageKey);
    
    if (value !== null) {
      overrides[flag] = value === 'true';
    }
  });

  return overrides;
}

/**
 * Clear all feature flag overrides (dev mode)
 */
export function clearFeatureFlagOverrides() {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;

  const flags = Object.keys(getFeatureFlags()) as (keyof FeatureFlags)[];
  
  flags.forEach(flag => {
    const storageKey = `feature_flag_${flag.toLowerCase()}`;
    localStorage.removeItem(storageKey);
  });

  window.location.reload();
}

/**
 * Feature flag context provider
 */
import { createContext, useContext, ReactNode } from 'react';

const FeatureFlagContext = createContext<FeatureFlags>(getFeatureFlags());

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const flags = getFeatureFlags();
  
  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}