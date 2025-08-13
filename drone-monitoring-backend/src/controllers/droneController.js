const Drone = require('../models/drone');
const TelemetryData = require('../models/telemetryData');
const logger = require('../utils/logger');
const mqttService = require('../services/mqttService');

// Get all drones with their current status
exports.getAllDrones = async (req, res) => {
  try {
    const drones = await Drone.find({});
    
    // Update online status for each drone and convert to frontend format
    const dronesWithStatus = drones.map(drone => {
      const isOnline = drone.updateOnlineStatus();
      // Use the new frontend-compatible method
      const frontendData = drone.toFrontendFormat();
      return frontendData;
    });
    
    res.status(200).json(dronesWithStatus);
  } catch (error) {
    logger.error('Error fetching drones:', error);
    res.status(500).json({ error: 'Failed to fetch drones' });
  }
};

// Get a specific drone by ID
exports.getDroneById = async (req, res) => {
  try {
    const drone = await Drone.findOne({ droneId: req.params.id });
    
    if (!drone) {
      return res.status(404).json({ error: 'Drone not found' });
    }
    
    const isOnline = drone.updateOnlineStatus();
    
    // Use the new frontend-compatible method
    const droneData = drone.toFrontendFormat();
    
    res.status(200).json(droneData);
  } catch (error) {
    logger.error(`Error fetching drone ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch drone' });
  }
};

// Get historical telemetry data for a specific drone
exports.getDroneHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange } = req.query;
    
    // Calculate time range based on query parameter
    let startTime = new Date();
    switch (timeRange) {
      case '10min':
        startTime.setMinutes(startTime.getMinutes() - 10);
        break;
      case '1h':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '6h':
        startTime.setHours(startTime.getHours() - 6);
        break;
      case '24h':
        startTime.setHours(startTime.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      default:
        // Default to last hour if no valid time range provided
        startTime.setHours(startTime.getHours() - 1);
    }
    
    const telemetryData = await TelemetryData.find({
      droneId: id,
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 });
    
    // Convert to frontend format
    const frontendData = telemetryData.map(data => data.toFrontendFormat());
    
    res.status(200).json(frontendData);
  } catch (error) {
    logger.error(`Error fetching history for drone ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch drone history' });
  }
};

// Get all mission logs
exports.getMissionLogs = async (req, res) => {
  try {
    const { startDate, endDate, droneId, limit = 100, offset = 0 } = req.query;
    
    // Build query filter
    const filter = {};
    
    if (droneId) {
      filter.droneId = droneId;
    }
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.timestamp = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.timestamp = { $lte: new Date(endDate) };
    }
    
    // Get total count for pagination
    const totalCount = await TelemetryData.countDocuments(filter);
    
    // Get mission logs with pagination
    const logs = await TelemetryData.find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Convert to frontend format
    const formattedLogs = logs.map(log => {
      const frontendData = log.toFrontendFormat();
      return {
        timestamp: frontendData.timestamp,
        droneId: frontendData.droneId,
        status: frontendData.status,
        battery: `${frontendData.battery}%`,
        temperature: `${frontendData.temperature}°C`,
        humidity: `${frontendData.humidity}%`,
        speed: `${frontendData.speed} km/h`,
        altitude: `${frontendData.altitude}m`,
        location: `${frontendData.lat}, ${frontendData.lng}`
      };
    });
    
    res.status(200).json({
      logs: formattedLogs,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + logs.length < totalCount
      }
    });
  } catch (error) {
    logger.error('Error fetching mission logs:', error);
    res.status(500).json({ error: 'Failed to fetch mission logs' });
  }
};

// Export mission logs as CSV
exports.exportLogsAsCsv = async (req, res) => {
  try {
    const { startDate, endDate, droneId } = req.query;
    
    // Build query filter
    const filter = {};
    
    if (droneId) {
      filter.droneId = droneId;
    }
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.timestamp = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.timestamp = { $lte: new Date(endDate) };
    }
    
    // Retrieve mission logs
    const logs = await TelemetryData.find(filter).sort({ timestamp: -1 });
    
    // Format logs for CSV export
    const { formatLogsAsCsv } = require('../utils/csvExporter');
    const csvData = await formatLogsAsCsv(logs);
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=mission-logs-${new Date().toISOString().split('T')[0]}.csv`);
    
    // Send CSV data
    res.status(200).send(csvData);
  } catch (error) {
    logger.error('Error exporting mission logs:', error);
    res.status(500).json({ error: 'Failed to export mission logs' });
  }
};

// Send command to drone via MQTT
exports.sendCommandToDrone = async (req, res) => {
  try {
    const { id } = req.params;
    const { command, parameters } = req.body;
    
    // Check if drone exists
    const drone = await Drone.findOne({ droneId: id });
    if (!drone) {
      return res.status(404).json({ error: 'Drone not found' });
    }
    
    // Check if drone is online
    if (!drone.updateOnlineStatus()) {
      return res.status(400).json({ error: 'Drone is offline' });
    }
    
    // Send command via MQTT
    const payload = {
      command,
      parameters,
      timestamp: new Date().toISOString()
    };
    
    const published = mqttService.publishToDrone(id, command, payload);
    
    if (published) {
      res.status(200).json({ success: true, message: `Command ${command} sent to drone ${id}` });
    } else {
      res.status(500).json({ error: 'Failed to send command to drone' });
    }
  } catch (error) {
    logger.error(`Error sending command to drone ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to send command to drone' });
  }
};

// Get telemetry data with filtering
exports.getTelemetryData = async (req, res) => {
  try {
    const { droneId, since, limit = 100, status } = req.query;
    
    // Build query filter
    const filter = {};
    
    if (droneId) {
      filter.droneId = droneId;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Date range filter
    if (since) {
      filter.timestamp = { $gte: new Date(since) };
    }
    
    // Get telemetry data with pagination
    const telemetryData = await TelemetryData.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Transform data to match frontend expectations
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
    
    res.status(200).json({
      logs: transformedData,
      total: transformedData.length,
      droneId: droneId || 'all',
      timeRange: since ? `since ${new Date(since).toISOString()}` : 'all time'
    });
    
  } catch (error) {
    logger.error('Error fetching telemetry data:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry data' });
  }
};

// Get migration status
exports.getMigrationStatus = async (req, res) => {
  try {
    const { checkMigrationStatus } = require('../utils/dataMigration');
    const status = await checkMigrationStatus();
    
    res.status(200).json({
      status: 'success',
      data: status,
      message: status.needsTelemetryMigration || status.needsDroneMigration ? 
        'Migration needed' : 'Data is up to date'
    });
  } catch (error) {
    logger.error('Error checking migration status:', error);
    res.status(500).json({ error: 'Failed to check migration status' });
  }
};

// Run data migration
exports.runMigration = async (req, res) => {
  try {
    const { runMigration } = require('../utils/dataMigration');
    const result = await runMigration();
    
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Migration completed successfully'
    });
  } catch (error) {
    logger.error('Error running migration:', error);
    res.status(500).json({ error: 'Failed to run migration' });
  }
};