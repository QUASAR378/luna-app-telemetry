const WebSocket = require('ws');
const logger = require('../utils/logger');
const Drone = require('../models/drone');
const TelemetryData = require('../models/telemetryData');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.isRunning = false;
  }

  initialize(server) {
    try {
      // Create WebSocket server attached to HTTP server
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        perMessageDeflate: false
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });

      this.isRunning = true;
      logger.info('WebSocket server initialized on /ws');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    ws.clientId = clientId;
    this.clients.add(ws);

    logger.info(`WebSocket client connected: ${clientId} (${this.clients.size} total clients)`);

    // Send initial connection confirmation
    this.sendToClient(ws, {
      type: 'connection',
      status: 'connected',
      clientId: clientId,
      timestamp: new Date().toISOString()
    });

    // Send initial data
    this.sendInitialData(ws);

    // Handle incoming messages
    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info(`WebSocket client disconnected: ${clientId} (${this.clients.size} remaining)`);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket client error (${clientId}):`, error);
      this.clients.delete(ws);
    });

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, {
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // 30 seconds
  }

  async handleMessage(ws, message) {
    try {
      const data = JSON.parse(message.toString());
      logger.debug(`Received WebSocket message from ${ws.clientId}:`, data);

      switch (data.type) {
        case 'subscribe_drones':
          await this.handleSubscribeDrones(ws);
          break;
        
        case 'subscribe_telemetry':
          await this.handleSubscribeTelemetry(ws, data.droneId);
          break;
        
        case 'get_drone_history':
          await this.handleGetDroneHistory(ws, data.droneId, data.timeRange);
          break;
        
        case 'send_command':
          await this.handleSendCommand(ws, data.droneId, data.command, data.parameters);
          break;
        
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        
        default:
          logger.warn(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  async sendInitialData(ws) {
    try {
      // Send current drone list
      await this.handleSubscribeDrones(ws);
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  async handleSubscribeDrones(ws) {
    try {
      const drones = await Drone.find({});
      const dronesWithStatus = drones.map(drone => {
        drone.updateOnlineStatus();
        return drone.toFrontendFormat();
      });

      this.sendToClient(ws, {
        type: 'drones_update',
        data: dronesWithStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching drones for WebSocket:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to fetch drones',
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleSubscribeTelemetry(ws, droneId) {
    try {
      const filter = droneId && droneId !== 'all' ? { droneId } : {};
      const telemetryData = await TelemetryData.find(filter)
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

      const transformedData = telemetryData.map(data => ({
        _id: data._id,
        droneId: data.droneId,
        timestamp: data.timestamp,
        battery: data.battery,
        temperature: data.temperature,
        humidity: data.humidity,
        speed: data.speed,
        altitude: data.altitude,
        lat: data.lat || data.location?.latitude || 0,
        lng: data.lng || data.location?.longitude || 0,
        status: data.status,
      }));

      this.sendToClient(ws, {
        type: 'telemetry_update',
        data: {
          logs: transformedData,
          total: transformedData.length,
          droneId: droneId || 'all'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching telemetry for WebSocket:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to fetch telemetry',
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleGetDroneHistory(ws, droneId, timeRange) {
    try {
      let since = new Date();
      switch (timeRange) {
        case '10m':
          since = new Date(Date.now() - 10 * 60 * 1000);
          break;
        case '1h':
          since = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '6h':
          since = new Date(Date.now() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          since = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          since = new Date(Date.now() - 60 * 60 * 1000);
      }

      const filter = { 
        droneId,
        timestamp: { $gte: since }
      };

      const historyData = await TelemetryData.find(filter)
        .sort({ timestamp: -1 })
        .limit(500)
        .lean();

      const transformedData = historyData.map(data => ({
        _id: data._id,
        droneId: data.droneId,
        timestamp: data.timestamp,
        battery: data.battery,
        temperature: data.temperature,
        humidity: data.humidity,
        speed: data.speed,
        altitude: data.altitude,
        lat: data.lat || data.location?.latitude || 0,
        lng: data.lng || data.location?.longitude || 0,
        status: data.status,
      }));

      this.sendToClient(ws, {
        type: 'drone_history',
        data: transformedData,
        droneId: droneId,
        timeRange: timeRange,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching drone history for WebSocket:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to fetch drone history',
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleSendCommand(ws, droneId, command, parameters) {
    try {
      // Import MQTT service to send command to ESP32
      const mqttService = require('./mqttService');
      
      const success = mqttService.publishToDrone(droneId, command, {
        command,
        parameters,
        timestamp: new Date().toISOString()
      });

      this.sendToClient(ws, {
        type: 'command_response',
        success: success,
        droneId: droneId,
        command: command,
        message: success ? 'Command sent successfully' : 'Failed to send command',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending command via WebSocket:', error);
      this.sendToClient(ws, {
        type: 'command_response',
        success: false,
        droneId: droneId,
        command: command,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Method to broadcast new telemetry data to all connected clients
  broadcastTelemetryUpdate(telemetryData) {
    if (!this.isRunning || this.clients.size === 0) return;

    const message = {
      type: 'telemetry_realtime',
      data: {
        _id: telemetryData._id,
        droneId: telemetryData.droneId,
        timestamp: telemetryData.timestamp,
        battery: telemetryData.battery,
        temperature: telemetryData.temperature,
        humidity: telemetryData.humidity,
        speed: telemetryData.speed,
        altitude: telemetryData.altitude,
        lat: telemetryData.lat || telemetryData.location?.latitude || 0,
        lng: telemetryData.lng || telemetryData.location?.longitude || 0,
        status: telemetryData.status,
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  // Method to broadcast drone status updates to all connected clients
  broadcastDroneStatusUpdate(drone) {
    if (!this.isRunning || this.clients.size === 0) return;

    const message = {
      type: 'drone_status_update',
      data: drone.toFrontendFormat(),
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    const deadClients = new Set();

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error(`Error sending to WebSocket client ${client.clientId}:`, error);
          deadClients.add(client);
        }
      } else {
        deadClients.add(client);
      }
    });

    // Clean up dead clients
    deadClients.forEach(client => {
      this.clients.delete(client);
    });
  }

  sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Error sending to WebSocket client ${client.clientId}:`, error);
        this.clients.delete(client);
      }
    }
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      clients: Array.from(this.clients).map(client => ({
        id: client.clientId,
        readyState: client.readyState
      }))
    };
  }

  shutdown() {
    if (this.wss) {
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });
      this.wss.close();
      this.isRunning = false;
      logger.info('WebSocket server shutdown');
    }
  }
}

// Create and export singleton instance
const webSocketService = new WebSocketService();
module.exports = webSocketService;
