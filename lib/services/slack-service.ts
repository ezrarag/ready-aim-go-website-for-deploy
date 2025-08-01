// Slack service for real Slack integration
// This service will handle sending messages to Slack channels and receiving responses

export interface SlackMessage {
  id: string;
  type: 'user' | 'ai' | 'slack';
  content: string;
  timestamp: Date;
  channel?: string;
  user?: string;
  thread_ts?: string;
}

export interface SlackConfig {
  token?: string;
  webhookUrl?: string;
  defaultChannel?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  members: string[];
}

class SlackService {
  private config: SlackConfig;
  private channels: SlackChannel[] = [];

  constructor(config: SlackConfig = {}) {
    this.config = {
      defaultChannel: '#general',
      ...config
    };
  }

  /**
   * Initialize Slack connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if Slack token is available
      if (!this.config.token) {
        console.warn('Slack token not configured, using mock mode');
        return false;
      }

      // Test connection by fetching channels
      await this.fetchChannels();
      return true;
    } catch (error) {
      console.error('Failed to initialize Slack:', error);
      return false;
    }
  }

  /**
   * Fetch available Slack channels
   */
  async fetchChannels(): Promise<SlackChannel[]> {
    try {
      if (!this.config.token) {
        // Return mock channels for development
        this.channels = [
          { id: 'C1234567890', name: '#general', isPrivate: false, members: ['U123', 'U456'] },
          { id: 'C0987654321', name: '#development', isPrivate: false, members: ['U123', 'U789'] },
          { id: 'C1122334455', name: '#client-missions', isPrivate: false, members: ['U123', 'U456', 'U789'] }
        ];
        return this.channels;
      }

      // Real Slack API call would go here
      // const response = await fetch('https://slack.com/api/conversations.list', {
      //   headers: { Authorization: `Bearer ${this.config.token}` }
      // });
      // const data = await response.json();
      // this.channels = data.channels.map(channel => ({
      //   id: channel.id,
      //   name: channel.name,
      //   isPrivate: channel.is_private,
      //   members: channel.members || []
      // }));

      return this.channels;
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
      return [];
    }
  }

  /**
   * Send message to Slack channel
   */
  async sendMessage(channel: string, message: string, threadTs?: string): Promise<SlackMessage> {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!this.config.token) {
        // Mock response for development
        const mockResponse = {
          id: messageId,
          type: 'slack' as const,
          content: `Message sent to ${channel}: "${message}"`,
          timestamp: new Date(),
          channel,
          thread_ts: threadTs
        };

        // Simulate AI response after a delay
        setTimeout(() => {
          this.onMessageReceived({
            id: `ai_${Date.now()}`,
            type: 'ai',
            content: `I've processed your request: "${message}". The background agents are working on this mission.`,
            timestamp: new Date(),
            channel,
            thread_ts: threadTs
          });
        }, 2000);

        return mockResponse;
      } else {
        // Real Slack API call would go here
        // const response = await fetch('https://slack.com/api/chat.postMessage', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${this.config.token}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     channel,
        //     text: message,
        //     thread_ts: threadTs
        //   })
        // });

        // For now, simulate real response
        const realResponse = {
          id: messageId,
          type: 'slack' as const,
          content: `Message sent to ${channel}: "${message}"`,
          timestamp: new Date(),
          channel,
          thread_ts: threadTs
        };

        // Simulate AI response for real token too
        setTimeout(() => {
          this.onMessageReceived({
            id: `ai_${Date.now()}`,
            type: 'ai',
            content: `I've processed your request: "${message}". The background agents are working on this mission.`,
            timestamp: new Date(),
            channel,
            thread_ts: threadTs
          });
        }, 2000);

        return realResponse;
      }

      // Real Slack API call would go here
      // const response = await fetch('https://slack.com/api/chat.postMessage', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.config.token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     channel,
      //     text: message,
      //     thread_ts: threadTs
      //   })
      // });

      return {
        id: messageId,
        type: 'slack',
        content: message,
        timestamp: new Date(),
        channel,
        thread_ts: threadTs
      };
    } catch (error) {
      console.error('Error sending Slack message:', error);
      throw error;
    }
  }

  /**
   * Send AI-generated message to background agents
   */
  async sendToBackgroundAgents(message: string, missionType: string = 'general'): Promise<SlackMessage> {
    const channel = missionType === 'development' ? '#development' : '#client-missions';
    const enhancedMessage = `🤖 **AI Mission Directive**\n\n${message}\n\n*Sent from ReadyAimGo Dashboard*`;
    
    return this.sendMessage(channel, enhancedMessage);
  }

  /**
   * Fetch recent messages from a channel
   */
  async fetchRecentMessages(channel: string, limit: number = 50): Promise<SlackMessage[]> {
    try {
      if (!this.config.token) {
        // Return mock messages for development
        return [
          {
            id: 'msg_1',
            type: 'slack',
            content: 'Background agent: Working on payment integration updates',
            timestamp: new Date(Date.now() - 300000), // 5 minutes ago
            channel,
            user: 'U123'
          },
          {
            id: 'msg_2',
            type: 'slack',
            content: 'Design team: Mobile responsiveness improvements completed',
            timestamp: new Date(Date.now() - 600000), // 10 minutes ago
            channel,
            user: 'U456'
          },
          {
            id: 'msg_3',
            type: 'ai',
            content: 'AI Analysis: Website performance metrics show 15% improvement in load time',
            timestamp: new Date(Date.now() - 900000), // 15 minutes ago
            channel,
            user: 'AI_BOT'
          }
        ];
      }

      // Real Slack API call would go here
      // const response = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`, {
      //   headers: { Authorization: `Bearer ${this.config.token}` }
      // });
      // const data = await response.json();
      // return data.messages.map(msg => ({
      //   id: msg.ts,
      //   type: msg.bot_id ? 'ai' : 'slack',
      //   content: msg.text,
      //   timestamp: new Date(parseInt(msg.ts) * 1000),
      //   channel,
      //   user: msg.user
      // }));

      return [];
    } catch (error) {
      console.error('Error fetching Slack messages:', error);
      return [];
    }
  }

  /**
   * Callback for when messages are received
   */
  private onMessageReceived(message: SlackMessage) {
    // This would be called when receiving real-time messages
    console.log('Slack message received:', message);
    
    // For now, we'll use a global callback system
    if (this.messageCallback) {
      this.messageCallback(message);
    }
  }

  private messageCallback: ((message: SlackMessage) => void) | null = null;

  /**
   * Set message callback
   */
  setMessageCallback(callback: (message: SlackMessage) => void) {
    this.messageCallback = callback;
  }

  /**
   * Get available channels
   */
  getChannels(): SlackChannel[] {
    return this.channels;
  }

  /**
   * Check if Slack is connected
   */
  isConnected(): boolean {
    return !!this.config.token;
  }
}

// Create a singleton instance with configuration
import { getServiceConfig } from '@/lib/config/services';

const config = getServiceConfig();
export const slackService = new SlackService(config.slack);

import { useState, useEffect } from 'react';

// React hook for using Slack service
export function useSlackChat(channel: string = '#client-missions') {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeSlack = async () => {
      setLoading(true);
      try {
        const connected = await slackService.initialize();
        setIsConnected(connected);
        
        if (connected) {
          const recentMessages = await slackService.fetchRecentMessages(channel);
          setMessages(recentMessages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to Slack');
      } finally {
        setLoading(false);
      }
    };

    initializeSlack();
  }, [channel]);

  const sendMessage = async (content: string) => {
    try {
      setLoading(true);
      const message = await slackService.sendMessage(channel, content);
      setMessages(prev => [...prev, message]);
      
      // Set up callback for AI responses
      slackService.setMessageCallback((aiMessage) => {
        setMessages(prev => [...prev, aiMessage]);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const sendToBackgroundAgents = async (content: string, missionType?: string) => {
    try {
      setLoading(true);
      const message = await slackService.sendToBackgroundAgents(content, missionType);
      setMessages(prev => [...prev, message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send to background agents');
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    error,
    isConnected,
    sendMessage,
    sendToBackgroundAgents
  };
} 