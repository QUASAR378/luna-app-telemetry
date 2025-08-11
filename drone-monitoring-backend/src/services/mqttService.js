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
      // Save telemetry data to database
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
        status: data.status || 'Standby',
      });

      await telemetryData.save();

      // Update drone with latest telemetry data
      const drone = await Drone.findOne({ droneId });
      if (drone) {
        drone.lastSeen = new Date();
        drone.lastLocation = {
          latitude: data.latitude || data.location?.latitude,
          longitude: data.longitude || data.location?.longitude,
        };
        drone.lastTelemetry = {
          battery: data.battery,
          temperature: data.temperature,
          humidity: data.humidity,
          speed: data.speed,
          altitude: data.altitude,
        };
        drone.status = data.status || drone.status;
        drone.updateOnlineStatus();
        await drone.save();
      }
    } catch (error) {
      logger.error(`Error processing telemetry data for drone ${droneId}:`, error);
    }
  }

  async _processDroneStatus(droneId, data) {
    try {
      // Update or create drone in database
      let drone = await Drone.findOne({ droneId });
      
      if (!drone) {
        // Create new drone if it doesn't exist
        drone = new Drone({
          droneId,
          name: data.name || `Drone ${droneId}`,
          status: data.status || 'Powered Off',
          isOnline: true,
          lastSeen: new Date(),
        });
      } else {
        // Update existing drone
        drone.status = data.status || drone.status;
        drone.lastSeen = new Date();
        if (data.name) drone.name = data.name;
        drone.updateOnlineStatus();
      }

      await drone.save();
    } catch (error) {
      logger.error(`Error processing status for drone ${droneId}:`, error);
    }
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