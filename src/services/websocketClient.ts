import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { BACKEND_CONFIG } from '@/config/backend';

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
  [key: string]: any;
}

export interface WebSocketCallbacks {
  onDronesUpdate?: (drones: DroneInfo[]) => void;
  onTelemetryUpdate?: (telemetry: { logs: TelemetryData[]; total: number; droneId: string }) => void;
  onTelemetryRealtime?: (telemetry: TelemetryData) => void;
  onDroneStatusUpdate?: (drone: DroneInfo) => void;
  onDroneHistory?: (data: TelemetryData[], droneId: string, timeRange: string) => void;
  onCommandResponse?: (response: { success: boolean; droneId: string; command: string; message: string }) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private callbacks: WebSocketCallbacks = {};
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private url: string;

  constructor() {
    // Use explicit WebSocket URL from environment or fallback to backend URL
    this.url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
               (BACKEND_CONFIG.server.baseUrl.replace(/^https?:\/\//, 'ws://') + '/ws');
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && this.isConnected) {
        resolve(true);
        return;
      }

      try {
        console.log('🔌 Connecting to WebSocket server:', this.url);
        
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ Connected to WebSocket server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.callbacks.onConnectionChange?.(true);
          this.startHeartbeat();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.callbacks.onError?.(new Error('WebSocket connection error'));
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket connection closed');
          this.isConnected = false;
          this.callbacks.onConnectionChange?.(false);
          this.stopHeartbeat();
          this.scheduleReconnect();
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        this.callbacks.onError?.(error as Error);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      console.log('🔌 Disconnecting from WebSocket server');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.stopHeartbeat();
      this.callbacks.onConnectionChange?.(false);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log(`📥 Received WebSocket message:`, message.type);

      switch (message.type) {
        case 'connection':
          console.log('✅ WebSocket connection confirmed:', message);
          break;

        case 'drones_update':
          if (this.callbacks.onDronesUpdate) {
            this.callbacks.onDronesUpdate(message.data);
          }
          break;

        case 'telemetry_update':
          if (this.callbacks.onTelemetryUpdate) {
            this.callbacks.onTelemetryUpdate(message.data);
          }
          break;

        case 'telemetry_realtime':
          if (this.callbacks.onTelemetryRealtime) {
            this.callbacks.onTelemetryRealtime(message.data);
          }
          break;

        case 'drone_status_update':
          if (this.callbacks.onDroneStatusUpdate) {
            this.callbacks.onDroneStatusUpdate(message.data);
          }
          break;

        case 'drone_history':
          if (this.callbacks.onDroneHistory) {
            this.callbacks.onDroneHistory(message.data, message.droneId, message.timeRange);
          }
          break;

        case 'command_response':
          if (this.callbacks.onCommandResponse) {
            this.callbacks.onCommandResponse({
              success: message.success,
              droneId: message.droneId,
              command: message.command,
              message: message.message
            });
          }
          break;

        case 'heartbeat':
          // Respond to heartbeat
          this.send({ type: 'ping' });
          break;

        case 'pong':
          // Heartbeat response received
          break;

        case 'error':
          console.error('❌ WebSocket server error:', message.message);
          this.callbacks.onError?.(new Error(message.message));
          break;

        default:
          console.log(`📥 Unknown WebSocket message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: any): boolean {
    if (!this.ws || !this.isConnected) {
      console.warn('⚠️ Cannot send: WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ Failed to send WebSocket message:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Subscribe to drone updates
   */
  public subscribeToDrones(): boolean {
    return this.send({
      type: 'subscribe_drones',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to telemetry updates for a specific drone
   */
  public subscribeToTelemetry(droneId?: string): boolean {
    return this.send({
      type: 'subscribe_telemetry',
      droneId: droneId || 'all',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get drone history for a specific time range
   */
  public getDroneHistory(droneId: string, timeRange: string): boolean {
    return this.send({
      type: 'get_drone_history',
      droneId: droneId,
      timeRange: timeRange,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send command to a drone
   */
  public sendCommand(droneId: string, command: string, parameters?: any): boolean {
    return this.send({
      type: 'send_command',
      droneId: droneId,
      command: command,
      parameters: parameters,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`🔄 Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Set callbacks for WebSocket events
   */
  public setCallbacks(callbacks: WebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Remove specific callback
   */
  public removeCallback(callbackName: keyof WebSocketCallbacks): void {
    delete this.callbacks[callbackName];
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.disconnect();
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();

// Export class for testing/advanced usage
export { WebSocketClient };
