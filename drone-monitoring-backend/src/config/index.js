const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

module.exports = {
  server: {
    port: process.env.PORT || 3001, // Changed from 3000 to 3001 to avoid conflict with frontend
    env: process.env.NODE_ENV || 'development',
  },
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/drone-monitoring',
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    webSocketUrl: process.env.MQTT_WEBSOCKET_URL || 'ws://localhost:9001',
    clientId: process.env.MQTT_CLIENT_ID || 'drone-monitoring-backend',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    topics: {
      droneData: 'drones/+/data', // + is a wildcard for drone ID
      droneStatus: 'drones/+/status',
      droneCommands: 'drones/+/commands',
      droneResponse: 'drones/+/response',
    },
    // Frontend MQTT settings
    frontend: {
      enableWebSocket: process.env.MQTT_ENABLE_WEBSOCKET !== 'false',
      webSocketPort: process.env.MQTT_WEBSOCKET_PORT || 9001,
      allowAnonymous: process.env.MQTT_ALLOW_ANONYMOUS !== 'false',
      maxClients: parseInt(process.env.MQTT_MAX_CLIENTS) || 100,
    },
  },
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
};