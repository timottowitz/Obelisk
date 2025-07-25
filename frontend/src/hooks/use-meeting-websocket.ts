/**
 * Meeting WebSocket Hook
 * React hook for managing meeting WebSocket connections and real-time updates
 * Integrates with existing authentication and organization context
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrganization } from '@clerk/nextjs';
import { 
  getMeetingWebSocket, 
  initializeMeetingWebSocket, 
  cleanupMeetingWebSocket,
  MeetingWebSocketEvent,
  MeetingSubscription 
} from '@/lib/websocket/meeting-websocket';

interface UseMeetingWebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: MeetingSubscription[];
}

interface MeetingWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: MeetingWebSocketEvent | null;
}

export function useMeetingWebSocket(options: UseMeetingWebSocketOptions = {}) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [state, setState] = useState<MeetingWebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
  });

  const wsClient = useRef(getMeetingWebSocket());
  const eventHandlers = useRef(new Map<string, (event: MeetingWebSocketEvent) => void>());

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await initializeMeetingWebSocket(token);
      
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false, 
        error: null 
      }));

      // Set up subscriptions
      if (options.subscriptions) {
        options.subscriptions.forEach(subscription => {
          wsClient.current.subscribe(subscription);
        });
      }

    } catch (error) {
      console.error('Failed to connect to meeting WebSocket:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }));
    }
  }, [getToken, options.subscriptions, state.isConnected, state.isConnecting]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    cleanupMeetingWebSocket();
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastEvent: null,
    });
  }, []);

  /**
   * Subscribe to meeting updates
   */
  const subscribe = useCallback((subscription: MeetingSubscription) => {
    if (state.isConnected) {
      wsClient.current.subscribe(subscription);
    }
  }, [state.isConnected]);

  /**
   * Unsubscribe from meeting updates
   */
  const unsubscribe = useCallback((subscription: MeetingSubscription) => {
    if (state.isConnected) {
      wsClient.current.unsubscribe(subscription);
    }
  }, [state.isConnected]);

  /**
   * Add event listener
   */
  const addEventListener = useCallback((
    eventType: MeetingWebSocketEvent['type'], 
    handler: (event: MeetingWebSocketEvent) => void
  ) => {
    const handlerKey = `${eventType}_${Math.random()}`;
    eventHandlers.current.set(handlerKey, handler);
    wsClient.current.on(eventType, handler);
    
    return () => {
      wsClient.current.off(eventType, handler);
      eventHandlers.current.delete(handlerKey);
    };
  }, []);

  /**
   * Send a meeting-related message (if needed for future features)
   */
  const sendMessage = useCallback((message: any) => {
    if (state.isConnected) {
      // This would be implemented if we need client-to-server messaging
      console.log('Send message:', message);
    }
  }, [state.isConnected]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect !== false && organization) {
      connect();
    }

    return () => {
      // Cleanup event handlers on unmount
      eventHandlers.current.forEach((handler, key) => {
        const [eventType] = key.split('_');
        wsClient.current.off(eventType as MeetingWebSocketEvent['type'], handler);
      });
      eventHandlers.current.clear();
    };
  }, [connect, options.autoConnect, organization]);

  // Set up global event handler to update state
  useEffect(() => {
    const handleAnyEvent = (event: MeetingWebSocketEvent) => {
      setState(prev => ({ ...prev, lastEvent: event }));
    };

    // Listen to all event types
    const eventTypes: MeetingWebSocketEvent['type'][] = [
      'meeting_started',
      'meeting_ended', 
      'participant_joined',
      'participant_left',
      'transcription_update',
      'ai_analysis_complete',
      'action_item_created',
      'decision_recorded',
      'meeting_status_changed',
      'processing_complete'
    ];

    const cleanupFunctions = eventTypes.map(eventType => 
      addEventListener(eventType, handleAnyEvent)
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [addEventListener]);

  return {
    // Connection state
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastEvent: state.lastEvent,
    
    // Connection methods
    connect,
    disconnect,
    
    // Subscription methods
    subscribe,
    unsubscribe,
    
    // Event handling
    addEventListener,
    
    // Utility methods
    sendMessage,
  };
}

/**
 * Hook for subscribing to specific meeting events
 */
export function useMeetingEvents(
  eventTypes: MeetingWebSocketEvent['type'][],
  handler: (event: MeetingWebSocketEvent) => void,
  options: UseMeetingWebSocketOptions = {}
) {
  const { addEventListener, ...wsState } = useMeetingWebSocket(options);

  useEffect(() => {
    const cleanupFunctions = eventTypes.map(eventType => 
      addEventListener(eventType, handler)
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [addEventListener, eventTypes, handler]);

  return wsState;
}

/**
 * Hook for live meeting updates
 */
export function useLiveMeetingUpdates(meetingId: string) {
  const [meetingData, setMeetingData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string>('');
  const [actionItems, setActionItems] = useState<any[]>([]);

  const wsState = useMeetingWebSocket({
    autoConnect: true,
    subscriptions: [
      {
        type: 'meeting_updates',
        filters: { meetingIds: [meetingId] }
      }
    ]
  });

  // Handle meeting-specific events
  useEffect(() => {
    if (!wsState.lastEvent || wsState.lastEvent.meetingId !== meetingId) {
      return;
    }

    const event = wsState.lastEvent;

    switch (event.type) {
      case 'participant_joined':
        setParticipants(prev => {
          const existing = prev.find(p => p.id === event.data.participant.id);
          if (existing) return prev;
          return [...prev, event.data.participant];
        });
        break;

      case 'participant_left':
        setParticipants(prev => 
          prev.filter(p => p.id !== event.data.participant.id)
        );
        break;

      case 'transcription_update':
        setTranscription(prev => prev + ' ' + event.data.text);
        break;

      case 'action_item_created':
        setActionItems(prev => [...prev, event.data]);
        break;

      case 'meeting_status_changed':
        setMeetingData((prev: any) => ({
          ...prev,
          status: event.data.status
        }));
        break;
    }
  }, [wsState.lastEvent, meetingId]);

  return {
    ...wsState,
    meetingData,
    participants,
    transcription,
    actionItems,
  };
}

export default useMeetingWebSocket;