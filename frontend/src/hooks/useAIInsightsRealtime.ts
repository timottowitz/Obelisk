import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { toast } from 'sonner';
import type { AITaskInsightWithDetails } from '@/types/ai-insights';

interface RealtimeMessage {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: AITaskInsightWithDetails;
  old_record?: AITaskInsightWithDetails;
}

/**
 * Hook for real-time AI insights updates via WebSocket/SSE
 */
export function useAIInsightsRealtime() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!organization?.id) return;

    const connectWebSocket = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Get WebSocket URL from environment
        const wsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          ?.replace('https://', 'wss://')
          ?.replace('http://', 'ws://');

        if (!wsUrl) {
          console.error('WebSocket URL not configured');
          return;
        }

        // Connect to Supabase Realtime
        const ws = new WebSocket(
          `${wsUrl}/realtime/v1/websocket?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}&vsn=1.0.0`
        );

        ws.onopen = () => {
          console.log('WebSocket connected for AI insights');
          reconnectAttemptsRef.current = 0;

          // Subscribe to AI insights channel for this organization
          ws.send(JSON.stringify({
            topic: `realtime:ai_insights:org_id=eq.${organization.id}`,
            event: 'phx_join',
            payload: {},
            ref: '1'
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.event === 'INSERT' || data.event === 'UPDATE' || data.event === 'DELETE') {
              handleRealtimeUpdate(data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          wsRef.current = null;

          // Implement exponential backoff for reconnection
          const attempts = reconnectAttemptsRef.current;
          if (attempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connectWebSocket();
            }, delay);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    const handleRealtimeUpdate = (message: RealtimeMessage) => {
      const { type, record, old_record } = message;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });

      // Show notification for new insights
      if (type === 'INSERT' && record.status === 'pending') {
        toast.info('New AI task suggestion received', {
          description: record.suggested_title,
          action: {
            label: 'View',
            onClick: () => {
              // Navigate to the insight or open panel
              window.dispatchEvent(new CustomEvent('open-ai-insight', { 
                detail: record 
              }));
            }
          }
        });

        // Update notification count
        queryClient.setQueryData(
          ['ai-insights', 'stats'],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pending: (oldData.pending || 0) + 1,
              total: (oldData.total || 0) + 1
            };
          }
        );
      }

      // Handle updates (acceptance/rejection)
      if (type === 'UPDATE' && old_record?.status === 'pending') {
        if (record.status === 'accepted') {
          toast.success('AI suggestion accepted', {
            description: `Task "${record.suggested_title}" created`
          });
        } else if (record.status === 'rejected') {
          toast.info('AI suggestion rejected');
        }

        // Update stats
        queryClient.setQueryData(
          ['ai-insights', 'stats'],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pending: Math.max(0, (oldData.pending || 0) - 1),
              [record.status]: (oldData[record.status] || 0) + 1
            };
          }
        );
      }
    };

    // Use alternative: Server-Sent Events if WebSocket not available
    const connectSSE = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const eventSource = new EventSource(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-insights-sse?org_id=${organization.id}`,
          {
            withCredentials: true
          }
        );

        eventSource.addEventListener('insight', (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        });

        eventSource.onerror = () => {
          console.error('SSE connection error');
          eventSource.close();
          
          // Retry after delay
          setTimeout(connectSSE, 5000);
        };

        return () => {
          eventSource.close();
        };
      } catch (error) {
        console.error('Failed to connect SSE:', error);
      }
    };

    // Try WebSocket first, fallback to SSE
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [organization?.id, getToken, queryClient]);
}

/**
 * Hook to listen for AI insight open events
 */
export function useAIInsightOpenListener(
  onOpen: (insight: AITaskInsightWithDetails) => void
) {
  useEffect(() => {
    const handleOpen = (event: CustomEvent) => {
      onOpen(event.detail);
    };

    window.addEventListener('open-ai-insight' as any, handleOpen);
    return () => {
      window.removeEventListener('open-ai-insight' as any, handleOpen);
    };
  }, [onOpen]);
}