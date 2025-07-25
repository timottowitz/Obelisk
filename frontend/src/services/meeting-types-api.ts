/**
 * Meeting Types API Service
 * Handles CRUD operations for custom meeting types via Supabase Edge Function
 */

import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';

export interface MeetingType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  system_prompt: string;
  output_format: 'json' | 'text' | 'markdown';
  is_active: boolean;
  member_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingTypeRequest {
  name: string;
  display_name: string;
  description?: string;
  system_prompt: string;
  output_format?: 'json' | 'text' | 'markdown';
}

export interface UpdateMeetingTypeRequest extends Partial<CreateMeetingTypeRequest> {
  is_active?: boolean;
}

// API Configuration - use call-recordings endpoint for meeting types
const API_BASE_URL = `${API_CONFIG.CALL_RECORDINGS_BASE_URL}/meeting-types`;

class MeetingTypesAPIService {
  /**
   * Get all active meeting types for current user
   */
  async getMeetingTypes(): Promise<{ meetingTypes: MeetingType[]; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE_URL, {
        headers,
      });
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching meeting types:', error);
      return { 
        meetingTypes: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch meeting types' 
      };
    }
  }

  /**
   * Get a specific meeting type by ID
   */
  async getMeetingType(id: string): Promise<{ meetingType?: MeetingType; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        headers,
      });
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching meeting type:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch meeting type' 
      };
    }
  }

  /**
   * Create a new meeting type
   */
  async createMeetingType(request: CreateMeetingTypeRequest): Promise<{ meetingType?: MeetingType; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error creating meeting type:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to create meeting type' 
      };
    }
  }

  /**
   * Update an existing meeting type
   */
  async updateMeetingType(id: string, request: UpdateMeetingTypeRequest): Promise<{ meetingType?: MeetingType; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(request),
      });
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error updating meeting type:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to update meeting type' 
      };
    }
  }

  /**
   * Delete a meeting type (soft delete by setting is_active to false)
   */
  async deleteMeetingType(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers,
      });
      
      const result = await handleApiResponse(response) as any;
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Error deleting meeting type:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete meeting type' 
      };
    }
  }

  /**
   * Get default template prompt for creating new meeting types
   */
  getDefaultPromptTemplate(): string {
    return `Focus your analysis on the following aspects for this type of meeting:

1. Identify key business decisions and their implications
2. Extract actionable items with clear ownership
3. Summarize participant contributions and engagement levels
4. Highlight any risks, concerns, or blockers mentioned
5. Note any deadlines, commitments, or follow-up requirements

Additional Analysis Instructions:
- Assess the overall meeting effectiveness
- Identify any unresolved issues that need follow-up
- Note the general sentiment and engagement level of participants
- Highlight any process improvements suggested during the meeting

Custom Focus Areas:
[Add your specific analysis requirements here - what makes this meeting type unique?
For example:
- For legal consultations: Focus on legal issues, compliance matters, and client concerns
- For sales calls: Emphasize prospect needs, objections, next steps, and deal progression  
- For team standups: Highlight blockers, progress updates, and team coordination needs
- For interviews: Focus on candidate responses, qualifications, and cultural fit assessment]`;
  }

  /**
   * Validate a meeting type name is unique (client-side validation)
   * Note: Server-side validation is also performed in the edge function
   */
  async validateMeetingTypeName(name: string, excludeId?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Get all meeting types and check locally
      // This is a simple client-side check; the authoritative check is on the server
      const { meetingTypes, error } = await this.getMeetingTypes();
      
      if (error) {
        return { isValid: false, error };
      }

      const existing = meetingTypes.find(mt => 
        mt.name === name && (!excludeId || mt.id !== excludeId)
      );

      return { isValid: !existing };
    } catch (error) {
      console.error('Error validating meeting type name:', error);
      return { 
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate name' 
      };
    }
  }
}

export const MeetingTypesAPI = new MeetingTypesAPIService();
