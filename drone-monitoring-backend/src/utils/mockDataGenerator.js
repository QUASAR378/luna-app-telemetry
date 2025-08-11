const mqtt = require('mqtt');
const config = require('../config');

// Mock drone IDs
const droneIds = ['A1', 'B2', 'C3', 'D4', 'E5'];
const droneNames = {
  'A1': 'Scout Alpha',
  'B2': 'Recon Beta',
  'C3': 'Surveyor Charlie',
  'D4': 'Observer Delta',
  'E5': 'Explorer Echo'
};

// Status options
const statusOptions = ['Powered Off', 'Standby', 'In Flight'];

// Location around Nairobi, Kenya (-1.3167, 36.8833)
const baseLocation = { latitude: -1.3167, longitude: 36.8833 };

// Connect to MQTT broker
const client = mqtt.connect(config.mqtt.brokerUrl, {
  clientId: 'mock-data-generator',
  clean: true,
});

client.on('connect', () => {
  console.log('Connected to MQTT broker, generating mock data...');
  
  // Register all drones first
  registerDrones();
  
  // Start sending telemetry data
  sendTelemetryData();
});

client.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

/**
 * Register drones with initial status
 */
function registerDrones() {
  droneIds.forEach(droneId => {
    const statusTopic = `drones/${droneId}/status`;
    const statusData = {
      name: droneNames[droneId],
      status: 'Standby',
      timestamp: new Date().toISOString()
    };
    
    client.publish(statusTopic, JSON.stringify(statusData), { qos: 1 });
    console.log(`Registered drone ${droneId} as ${droneNames[droneId]}`);
  });
}

/**
 * Generate random telemetry data for drones
 */
function sendTelemetryData() {
  droneIds.forEach(droneId => {
    // Determine if drone is active (80% chance)
    const isActive = Math.random() < 0.8;
    
    if (isActive) {
      // Determine drone status
      let status;
      const rand = Math.random();
      if (rand < 0.1) {
        status = 'Powered Off';
      } else if (rand < 0.4) {
        status = 'Standby';
      } else {
        status = 'In Flight';
      }
      
      // Generate random telemetry data
      const telemetryData = {
        status,
        battery: generateRandomValue(50, 100, 2), // 50-100%
        temperature: generateRandomValue(20, 35, 1), // 20-35°C
        humidity: generateRandomValue(40, 90, 1), // 40-90%
        speed: status === 'In Flight' ? generateRandomValue(10, 60, 1) : 0, // 10-60 km/h if in flight, 0 otherwise
        altitude: status === 'In Flight' ? generateRandomValue(50, 500, 1) : 0, // 50-500m if in flight, 0 otherwise
        timestamp: new Date().toISOString()
      };
      
      // Add location data (randomized around base location)
      if (status === 'In Flight') {
        // Random movement within ~5km radius
        telemetryData.latitude = baseLocation.latitude + (Math.random() * 0.1 - 0.05);
        telemetryData.longitude = baseLocation.longitude + (Math.random() * 0.1 - 0.05);
      } else {
        // Small random movement for stationary drones (~100m radius)
        telemetryData.latitude = baseLocation.latitude + (Math.random() * 0.001 - 0.0005);
        telemetryData.longitude = baseLocation.longitude + (Math.random() * 0.001 - 0.0005);
      }
      
      // Publish telemetry data
      const dataTopic = `drones/${droneId}/data`;
      client.publish(dataTopic, JSON.stringify(telemetryData), { qos: 1 });
      console.log(`Sent telemetry data for drone ${droneId} (${status})`);
    } else {
      console.log(`Drone ${droneId} is inactive (simulating offline)`);
    }
  });
  
  // Schedule next update (every 5-10 seconds)
  const nextInterval = Math.floor(Math.random() * 5000) + 5000;
  setTimeout(sendTelemetryData, nextInterval);
}

/**
 * Generate random number within range with specified decimal places
 */
function generateRandomValue(min, max, decimalPlaces) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimalPlaces));
}

process.on('SIGINT', () => {
  console.log('Stopping mock data generator...');
  client.end();
  process.exit(0);
});

console.log('Mock data generator started. Press Ctrl+C to stop.');