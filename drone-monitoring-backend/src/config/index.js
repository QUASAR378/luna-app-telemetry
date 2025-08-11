const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/drone-monitoring',
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    clientId: process.env.MQTT_CLIENT_ID || 'drone-monitoring-backend',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    topics: {
      droneData: 'drones/+/data', // + is a wildcard for drone ID
      droneStatus: 'drones/+/status',
    },
  },
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
};