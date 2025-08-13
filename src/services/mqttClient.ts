import mqtt, { MqttClient, IClientOptions, IMessage } from "mqtt";
import { BACKEND_CONFIG } from '@/config/backend';
import { TelemetryData, DroneInfo } from '@/types/telemetry';

// MQTT message types
export interface MqttDroneData {
  droneId: string;
  timestamp: string;
  battery: number;
  temperature: number;
  humidity: number;
  speed: number;
  altitude: number;
  latitude: number;
  longitude: number;
  status: string;
}

export interface MqttDroneStatus {
  droneId: string;
  name: string;
  status: string;
  isOnline: boolean;
  lastSeen: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
  };
  lastTelemetry?: {
    battery: number;
    temperature: number;
    humidity: number;
    speed: number;
    altitude: number;
  };
}

export interface MqttCommand {
  command: string;
  parameters?: any;
  timestamp: string;
}

// MQTT event callbacks
export interface MqttCallbacks {
  onDroneData?: (data: MqttDroneData) => void;
  onDroneStatus?: (status: MqttDroneStatus) => void;
  onCommandResponse?: (response: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

class MqttService {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private callbacks: MqttCallbacks = {};
  private subscribedTopics: Set<string> = new Set();

  constructor() {
    // Auto-connect if MQTT is enabled
    if (BACKEND_CONFIG.features.enableMQTT) {
      this.connect();
    }
  }

  /**
   * Connect to MQTT broker
   */
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.client && this.isConnected) {
        resolve(true);
        return;
      }

      try {
        const options: IClientOptions = {
          clientId: BACKEND_CONFIG.mqtt.clientId,
          clean: true,
          reconnectPeriod: 5000,
          connectTimeout: 10000,
          keepalive: 60,
          rejectUnauthorized: false,
        };

        console.log('🔌 Connecting to MQTT broker:', BACKEND_CONFIG.mqtt.brokerUrl);
        
        this.client = mqtt.connect(BACKEND_CONFIG.mqtt.brokerUrl, options);

        this.client.on('connect', () => {
          console.log('✅ Connected to MQTT broker');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.callbacks.onConnectionChange?.(true);
          
          // Resubscribe to previously subscribed topics
          this.subscribedTopics.forEach(topic => {
            this.client?.subscribe(topic);
          });
          
          resolve(true);
        });

        this.client.on('message', this.handleMessage.bind(this));
        this.client.on('error', this.handleError.bind(this));
        this.client.on('offline', this.handleOffline.bind(this));
        this.client.on('reconnect', this.handleReconnect.bind(this));
        this.client.on('close', this.handleClose.bind(this));

      } catch (error) {
        console.error('❌ Failed to create MQTT client:', error);
        this.callbacks.onError?.(error as Error);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  public disconnect(): void {
    if (this.client) {
      console.log('🔌 Disconnecting from MQTT broker');
      this.client.end();
      this.client = null;
      this.isConnected = false;
      this.subscribedTopics.clear();
      this.callbacks.onConnectionChange?.(false);
    }
  }

  /**
   * Subscribe to drone telemetry data
   */
  public subscribeToDroneData(callback: (data: MqttDroneData) => void): void {
    this.callbacks.onDroneData = callback;
    this.subscribe(BACKEND_CONFIG.mqtt.topics.droneData);
  }

  /**
   * Subscribe to drone status updates
   */
  public subscribeToDroneStatus(callback: (status: MqttDroneStatus) => void): void {
    this.callbacks.onDroneStatus = callback;
    this.subscribe(BACKEND_CONFIG.mqtt.topics.droneStatus);
  }

  /**
   * Subscribe to command responses
   */
  public subscribeToCommandResponses(droneId: string, callback: (response: any) => void): void {
    this.callbacks.onCommandResponse = callback;
    const topic = `drones/${droneId}/response`;
    this.subscribe(topic);
  }

  /**
   * Subscribe to a topic
   */
  private subscribe(topic: string): void {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Cannot subscribe: MQTT client not connected');
      return;
    }

    if (this.subscribedTopics.has(topic)) {
      return; // Already subscribed
    }

    this.client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}:`, err);
        this.callbacks.onError?.(err);
      } else {
        console.log(`✅ Subscribed to ${topic}`);
        this.subscribedTopics.add(topic);
      }
    });
  }

  /**
   * Publish command to a drone
   */
  public publishCommand(droneId: string, command: string, parameters?: any): boolean {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Cannot publish: MQTT client not connected');
      return false;
    }

    const topic = `drones/${droneId}/commands`;
    const payload: MqttCommand = {
      command,
      parameters,
      timestamp: new Date().toISOString(),
    };

    try {
      this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
      console.log(`📤 Published command to ${topic}:`, payload);
      return true;
    } catch (error) {
      console.error(`❌ Failed to publish command to ${topic}:`, error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      console.log(`📥 Received message on ${topic}:`, payload);

      // Extract drone ID from topic
      const topicParts = topic.split('/');
      const droneId = topicParts[1];
      const messageType = topicParts[2];

      switch (messageType) {
        case 'data':
          if (this.callbacks.onDroneData) {
            const droneData: MqttDroneData = {
              droneId,
              timestamp: payload.timestamp || new Date().toISOString(),
              battery: payload.battery,
              temperature: payload.temperature,
              humidity: payload.humidity,
              speed: payload.speed,
              altitude: payload.altitude,
              latitude: payload.latitude || payload.location?.latitude,
              longitude: payload.longitude || payload.location?.longitude,
              status: payload.status,
            };
            this.callbacks.onDroneData(droneData);
          }
          break;

        case 'status':
          if (this.callbacks.onDroneStatus) {
            const droneStatus: MqttDroneStatus = {
              droneId,
              name: payload.name,
              status: payload.status,
              isOnline: payload.isOnline,
              lastSeen: payload.lastSeen || new Date().toISOString(),
              lastLocation: payload.lastLocation,
              lastTelemetry: payload.lastTelemetry,
            };
            this.callbacks.onDroneStatus(droneStatus);
          }
          break;

        case 'response':
          if (this.callbacks.onCommandResponse) {
            this.callbacks.onCommandResponse(payload);
          }
          break;

        default:
          console.log(`📥 Unknown message type: ${messageType}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse MQTT message:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Handle MQTT errors
   */
  private handleError(error: Error): void {
    console.error('❌ MQTT error:', error);
    this.callbacks.onError?.(error);
  }

  /**
   * Handle MQTT offline events
   */
  private handleOffline(): void {
    console.warn('⚠️ MQTT client went offline');
    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);
    this.scheduleReconnect();
  }

  /**
   * Handle MQTT reconnect attempts
   */
  private handleReconnect(): void {
    console.log('🔄 Attempting to reconnect to MQTT broker...');
  }

  /**
   * Handle MQTT connection close
   */
  private handleClose(): void {
    console.log('🔌 MQTT connection closed');
    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);
    this.scheduleReconnect();
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

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

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
   * Get subscribed topics
   */
  public getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }

  /**
   * Set callbacks
   */
  public setCallbacks(callbacks: MqttCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Remove specific callback
   */
  public removeCallback(callbackName: keyof MqttCallbacks): void {
    delete this.callbacks[callbackName];
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.disconnect();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Export singleton instance
export const mqttService = new MqttService();

// Export class for testing/advanced usage
export { MqttService }; 