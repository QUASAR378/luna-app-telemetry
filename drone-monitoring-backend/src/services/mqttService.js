const mqtt = require('mqtt');
const config = require('../config');
const logger = require('../utils/logger');
const Drone = require('../models/drone');
const TelemetryData = require('../models/telemetryData');

class MqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    try {
      const options = {
        clientId: config.mqtt.clientId + '_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000,
      };

      // Add credentials if provided
      if (config.mqtt.username && config.mqtt.password) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
      }

      this.client = mqtt.connect(config.mqtt.brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Connected to MQTT broker');
        this._subscribe();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error:', error);
        this.isConnected = false;
      });

      this.client.on('offline', () => {
        logger.warn('MQTT client is offline');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        logger.info('Attempting to reconnect to MQTT broker');
      });

      this.client.on('message', this._handleMessage.bind(this));
    } catch (error) {
      logger.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  _subscribe() {
    // Subscribe to drone data and status topics
    this.client.subscribe(config.mqtt.topics.droneData, { qos: 1 }, (err) => {
      if (err) {
        logger.error('Error subscribing to drone data topic:', err);
      } else {
        logger.info('Subscribed to drone data topic');
      }
    });

    this.client.subscribe(config.mqtt.topics.droneStatus, { qos: 1 }, (err) => {
      if (err) {
        logger.error('Error subscribing to drone status topic:', err);
      } else {
        logger.info('Subscribed to drone status topic');
      }
    });
  }

  async _handleMessage(topic, message) {
    try {
      // Parse the message
      const payload = JSON.parse(message.toString());
      
      // Extract drone ID from topic
      // Example topic: drones/B2/data
      const topicParts = topic.split('/');
      const droneId = topicParts[1];
      const messageType = topicParts[2]; // 'data' or 'status'

      logger.debug(`Received ${messageType} from drone ${droneId}`);

      if (messageType === 'data') {
        await this._processTelemetryData(droneId, payload);
      } else if (messageType === 'status') {
        await this._processDroneStatus(droneId, payload);
      }
    } catch (error) {
      logger.error('Error processing MQTT message:', error);
    }
  }

  async _processTelemetryData(droneId, data) {
    try {
      // Normalize status to match frontend expectations
      const normalizedStatus = this._normalizeStatus(data.status);
      
      // Save telemetry data to database with frontend-compatible structure
      const telemetryData = new TelemetryData({
        droneId,
        timestamp: new Date(),
        battery: data.battery,
        temperature: data.temperature,
        humidity: data.humidity,
        speed: data.speed,
        altitude: data.altitude,
        location: {
          latitude: data.latitude || data.location?.latitude,
          longitude: data.longitude || data.location?.longitude,
        },
        // Also store as lat/lng for frontend compatibility
        lat: data.lat || data.latitude || data.location?.latitude,
        lng: data.lng || data.longitude || data.location?.longitude,
        status: normalizedStatus,
      });

      await telemetryData.save();

      // Broadcast real-time update to WebSocket clients
      const webSocketService = require('./websocketService');
      webSocketService.broadcastTelemetryUpdate(telemetryData);

      // Update drone with latest telemetry data
      const drone = await Drone.findOne({ droneId });
      if (drone) {
        drone.lastSeen = new Date();
        drone.lastLocation = {
          latitude: data.latitude || data.location?.latitude || data.lat,
          longitude: data.longitude || data.location?.longitude || data.lng,
        };
        drone.lastTelemetry = {
          battery: data.battery,
          temperature: data.temperature,
          humidity: data.humidity,
          speed: data.speed,
          altitude: data.altitude,
        };
        drone.status = normalizedStatus;
        drone.updateOnlineStatus();
        await drone.save();
        
        // Broadcast drone status update to WebSocket clients
        webSocketService.broadcastDroneStatusUpdate(drone);
      }
    } catch (error) {
      logger.error(`Error processing telemetry data for drone ${droneId}:`, error);
    }
  }

  async _processDroneStatus(droneId, data) {
    try {
      // Normalize status to match frontend expectations
      const normalizedStatus = this._normalizeStatus(data.status);
      
      // Update or create drone in database
      let drone = await Drone.findOne({ droneId });
      
      if (!drone) {
        // Create new drone if it doesn't exist
        drone = new Drone({
          droneId,
          name: data.name || `Drone ${droneId}`,
          status: normalizedStatus,
          isOnline: true,
          lastSeen: new Date(),
        });
      } else {
        // Update existing drone
        drone.status = normalizedStatus;
        drone.lastSeen = new Date();
        if (data.name) drone.name = data.name;
        drone.updateOnlineStatus();
      }

      await drone.save();
      
      // Broadcast drone status update to WebSocket clients
      const webSocketService = require('./websocketService');
      webSocketService.broadcastDroneStatusUpdate(drone);
    } catch (error) {
      logger.error(`Error processing status for drone ${droneId}:`, error);
    }
  }

  // Normalize status values to match frontend expectations
  _normalizeStatus(status) {
    if (!status) return 'Standby';
    
    const statusMap = {
      'powered_off': 'Powered Off',
      'powered off': 'Powered Off',
      'in_flight': 'In Flight',
      'in flight': 'In Flight',
      'pre_flight': 'Pre-Flight',
      'pre flight': 'Pre-Flight',
      'returning': 'Returning',
      'delivered': 'Delivered',
      'landing': 'Landing',
      'maintenance': 'Maintenance',
      'emergency': 'Emergency',
      'active': 'Active',
      'standby': 'Standby',
    };

    const normalized = statusMap[status.toLowerCase()] || status;
    
    // Validate against allowed statuses
    const allowedStatuses = [
      'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
      'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
    ];
    
    return allowedStatuses.includes(normalized) ? normalized : 'Standby';
  }

  disconnect() {
    if (this.client && this.isConnected) {
      this.client.end();
      logger.info('Disconnected from MQTT broker');
      this.isConnected = false;
    }
  }

  // Method to publish messages to drones if needed
  publishToDrone(droneId, command, payload) {
    if (!this.isConnected) {
      logger.error('Cannot publish: MQTT client is not connected');
      return false;
    }

    const topic = `drones/${droneId}/commands`;
    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    logger.debug(`Published ${command} command to drone ${droneId}`);
    return true;
  }
}

// Create and export a singleton instance
const mqttService = new MqttService();
module.exports = mqttService;