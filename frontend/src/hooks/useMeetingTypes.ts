/**
 * Hook for managing meeting types
 * Provides CRUD operations and caching for meeting types
 */

import { useState, useEffect, useCallback } from 'react';
import { MeetingType, MeetingTypesAPI } from '@/services/meeting-types-api';

interface UseMeetingTypesResult {
  meetingTypes: MeetingType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createMeetingType: (data: {
    name: string;
    display_name: string;
    description?: string;
    system_prompt: string;
    output_format?: 'json' | 'text' | 'markdown';
  }) => Promise<{
    success: boolean;
    meetingType?: MeetingType;
    error?: string;
  }>;
  updateMeetingType: (
    id: string,
    data: Partial<MeetingType>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteMeetingType: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  getMeetingTypeById: (id: string) => MeetingType | undefined;
}

export function useMeetingTypes(): UseMeetingTypesResult {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch meeting types
  const fetchMeetingTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { meetingTypes: types, error: fetchError } =
        await MeetingTypesAPI.getMeetingTypes();

      if (fetchError) {
        setError(fetchError);
      } else {
        setMeetingTypes(types);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch meeting types'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMeetingTypes();
  }, [fetchMeetingTypes]);

  // Create meeting type
  const createMeetingType = useCallback(
    async (data: {
      name: string;
      display_name: string;
      description?: string;
      system_prompt: string;
      output_format?: 'json' | 'text' | 'markdown';
    }) => {
      try {
        const result = await MeetingTypesAPI.createMeetingType(data);

        if (result.error) {
          return { success: false, error: result.error };
        }

        if (result.meetingType) {
          // Add to local state
          setMeetingTypes((prev) => [...prev, result.meetingType!]);
          return { success: true, meetingType: result.meetingType };
        }

        return { success: false, error: 'Unknown error occurred' };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create meeting type';
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Update meeting type
  const updateMeetingType = useCallback(
    async (id: string, data: Partial<MeetingType>) => {
      try {
        const result = await MeetingTypesAPI.updateMeetingType(id, data);

        if (result.error) {
          return { success: false, error: result.error };
        }

        if (result.meetingType) {
          // Update in local state
          setMeetingTypes((prev) =>
            prev.map((type) => (type.id === id ? result.meetingType! : type))
          );
          return { success: true };
        }

        return { success: false, error: 'Unknown error occurred' };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update meeting type';
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Delete meeting type
  const deleteMeetingType = useCallback(async (id: string) => {
    try {
      const result = await MeetingTypesAPI.deleteMeetingType(id);

      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.success) {
        // Remove from local state
        setMeetingTypes((prev) => prev.filter((type) => type.id !== id));
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete meeting type';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Get meeting type by ID
  const getMeetingTypeById = useCallback(
    (id: string) => {
      return meetingTypes.find((type) => type.id === id);
    },
    [meetingTypes]
  );

  // Refetch (public interface)
  const refetch = useCallback(() => fetchMeetingTypes(), [fetchMeetingTypes]);

  return {
    meetingTypes,
    loading,
    error,
    refetch,
    createMeetingType,
    updateMeetingType,
    deleteMeetingType,
    getMeetingTypeById
  };
}

export default useMeetingTypes;
