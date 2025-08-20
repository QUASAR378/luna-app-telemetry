const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const connectDatabase = require('./utils/database');
const mqttService = require('./services/mqttService');
const webSocketService = require('./services/websocketService');
const droneRoutes = require('./routes/droneRoutes');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API routes
app.use('/api/drones', droneRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      mqtt: mqttService.isConnected ? 'connected' : 'disconnected',
      websocket: webSocketService.getStatus(),
    },
    uptime: process.uptime(),
  });
});

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.json({
    message: 'Luna Drone Monitoring Backend',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      drones: '/api/drones',
      telemetry: '/api/drones/telemetry/data',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Connect to MQTT broker (for ESP32 communication)
    mqttService.connect();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize WebSocket service (for frontend communication)
    webSocketService.initialize(server);
    
    // Start HTTP server
    server.listen(config.server.port, () => {
      logger.info(`Server started on port ${config.server.port} in ${config.server.env} mode`);
      logger.info(`WebSocket server available at ws://localhost:${config.server.port}/ws`);
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      // Shutdown WebSocket service
      webSocketService.shutdown();
      
      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Disconnect MQTT
      mqttService.disconnect();
      
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize server
startServer();

module.exports = app;