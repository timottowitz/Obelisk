// API Configuration for Call Recordings
export const API_CONFIG = {
  // Supabase Edge Function URL for Call Recordings
  CALL_RECORDINGS_BASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/call-recordings`
    : 'https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/call-recordings',

  STORAGE_BASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/storage`
    : 'https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/storage',

  CASES_BASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cases`
    : 'https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/cases',

  EVENTS_BASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/events`
    : 'https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/events',

  TASKS_BASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tasks`
    : 'https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/tasks',

  AI_INSIGHTS_BASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-insights`
    : 'https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/ai-insights',

  // Default pagination settings
  DEFAULT_LIMIT: 50,
  DEFAULT_ORDER_BY: 'start_time',
  DEFAULT_ORDER_DIRECTION: 'desc' as const,

  // Recording settings
  RECORDING_SETTINGS: {
    VIDEO_BITS_PER_SECOND: 2500000, // 2.5 Mbps
    INCLUDE_SYSTEM_AUDIO: true,
    INCLUDE_MICROPHONE: false
  },

  // File upload settings
  UPLOAD_SETTINGS: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    SUPPORTED_MIME_TYPES: [
      'video/webm',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv'
    ]
  }
};

// Helper function to validate API configuration
export function validateApiConfig(): boolean {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not set. Using default URL.');
    return false;
  }
  return true;
}

// Helper function to get auth headers
export async function getAuthHeaders(): Promise<HeadersInit> {
  // Check if Clerk is available in the window object
  const clerk = (window as any).Clerk;
  if (!clerk?.session) {
    throw new Error('No authentication token available');
  }

  const token = await clerk.session.getToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Helper function to handle API responses
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }
  return response.json();
}
