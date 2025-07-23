/**
 * Meeting WebSocket Client
 * Real-time updates for meeting intelligence features
 * Extends existing WebSocket infrastructure with meeting-specific events
 */

'use client';

import { toast } from '@/components/ui/use-toast';

export interface MeetingWebSocketEvent {
  type: 'meeting_started' | 'meeting_ended' | 'participant_joined' | 'participant_left' | 
        'transcription_update' | 'ai_analysis_complete' | 'action_item_created' | 
        'decision_recorded' | 'meeting_status_changed' | 'processing_complete';
  meetingId: string;
  organizationId: string;
  data: any;
  timestamp: string;
}

export interface MeetingSubscription {
  type: 'meeting_updates' | 'organization_meetings' | 'user_meetings';
  filters?: {
    meetingIds?: string[];
    meetingTypes?: string[];
    userId?: string;
  };
}

class MeetingWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions = new Set<string>();
  private eventHandlers = new Map<string, ((event: MeetingWebSocketEvent) => void)[]>();
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';

  constructor(private baseUrl: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001') {}

  /**
   * Connect to WebSocket server
   */
  connect(authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionState = 'connecting';
        
        // Construct WebSocket URL with auth token
        const wsUrl = `${this.baseUrl}/meetings?token=${encodeURIComponent(authToken)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Meeting WebSocket connected');
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          
          // Restore subscriptions after reconnection
          this.restoreSubscriptions();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: MeetingWebSocketEvent = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('Meeting WebSocket disconnected:', event.code, event.reason);
          this.connectionState = 'disconnected';
          this.ws = null;
          
          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(authToken);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Meeting WebSocket error:', error);
          this.connectionState = 'error';
          reject(error);
        };

      } catch (error) {
        this.connectionState = 'error';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.connectionState = 'disconnected';
  }

  /**
   * Subscribe to meeting updates
   */
  subscribe(subscription: MeetingSubscription): void {
    if (this.connectionState !== 'connected') {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    const subscriptionKey = JSON.stringify(subscription);
    this.subscriptions.add(subscriptionKey);

    this.send({
      action: 'subscribe',
      subscription
    });
  }

  /**
   * Unsubscribe from meeting updates
   */
  unsubscribe(subscription: MeetingSubscription): void {
    const subscriptionKey = JSON.stringify(subscription);
    this.subscriptions.delete(subscriptionKey);

    if (this.connectionState === 'connected') {
      this.send({
        action: 'unsubscribe',
        subscription
      });
    }
  }

  /**
   * Add event handler for specific event types
   */
  on(eventType: MeetingWebSocketEvent['type'], handler: (event: MeetingWebSocketEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove event handler
   */
  off(eventType: MeetingWebSocketEvent['type'], handler: (event: MeetingWebSocketEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Send message to server
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MeetingWebSocketEvent): void {
    // Call registered event handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }

    // Show toast notifications for certain events
    this.showNotificationIfNeeded(event);
  }

  /**
   * Show toast notifications for relevant events
   */
  private showNotificationIfNeeded(event: MeetingWebSocketEvent): void {
    switch (event.type) {
      case 'meeting_started':
        toast({
          title: 'Meeting Started',
          description: `${event.data.title} has begun`,
          duration: 5000,
        });
        break;

      case 'meeting_ended':
        toast({
          title: 'Meeting Ended',
          description: `${event.data.title} has concluded`,
          duration: 5000,
        });
        break;

      case 'ai_analysis_complete':
        toast({
          title: 'AI Analysis Complete',
          description: `Analysis ready for ${event.data.title}`,
          duration: 5000,
        });
        break;

      case 'action_item_created':
        toast({
          title: 'New Action Item',
          description: `"${event.data.task_description}" assigned`,
          duration: 5000,
        });
        break;

      case 'processing_complete':
        toast({
          title: 'Processing Complete',
          description: `${event.data.title} is ready for review`,
          duration: 5000,
        });
        break;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(authToken: string): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.connectionState === 'disconnected') {
        this.connect(authToken).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Restore subscriptions after reconnection
   */
  private restoreSubscriptions(): void {
    this.subscriptions.forEach(subscriptionKey => {
      try {
        const subscription = JSON.parse(subscriptionKey);
        this.send({
          action: 'subscribe',
          subscription
        });
      } catch (error) {
        console.error('Failed to restore subscription:', error);
      }
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }
}

// Global WebSocket client instance
let meetingWSClient: MeetingWebSocketClient | null = null;

/**
 * Get or create global WebSocket client instance
 */
export function getMeetingWebSocket(): MeetingWebSocketClient {
  if (!meetingWSClient) {
    meetingWSClient = new MeetingWebSocketClient();
  }
  return meetingWSClient;
}

/**
 * Initialize WebSocket connection with authentication
 */
export async function initializeMeetingWebSocket(authToken: string): Promise<void> {
  const client = getMeetingWebSocket();
  await client.connect(authToken);
}

/**
 * Cleanup WebSocket connection
 */
export function cleanupMeetingWebSocket(): void {
  if (meetingWSClient) {
    meetingWSClient.disconnect();
    meetingWSClient = null;
  }
}

export default MeetingWebSocketClient;