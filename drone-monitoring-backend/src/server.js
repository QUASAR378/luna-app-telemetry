const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const connectDatabase = require('./utils/database');
const mqttService = require('./services/mqttService');
const droneRoutes = require('./routes/droneRoutes');

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
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    mqtt: mqttService.isConnected ? 'connected' : 'disconnected',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
    
    // Connect to MQTT broker
    mqttService.connect();
    
    // Start Express server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server started on port ${config.server.port} in ${config.server.env} mode`);
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      server.close(() => {
        logger.info('Express server closed');
      });
      
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