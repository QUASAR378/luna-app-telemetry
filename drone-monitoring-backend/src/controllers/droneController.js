const Drone = require('../models/drone');
const TelemetryData = require('../models/telemetryData');
const logger = require('../utils/logger');
const mqttService = require('../services/mqttService');

// Get all drones with their current status
exports.getAllDrones = async (req, res) => {
  try {
    const drones = await Drone.find({});
    
    // Update online status for each drone
    const dronesWithStatus = drones.map(drone => {
      const isOnline = drone.updateOnlineStatus();
      return {
        id: drone.droneId,
        name: drone.name,
        status: drone.status,
        isOnline: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: drone.lastSeen,
        lastLocation: drone.lastLocation,
        lastTelemetry: drone.lastTelemetry,
      };
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
    
    const droneData = {
      id: drone.droneId,
      name: drone.name,
      status: drone.status,
      isOnline: isOnline ? 'ONLINE' : 'OFFLINE',
      lastSeen: drone.lastSeen,
      lastLocation: drone.lastLocation,
      lastTelemetry: drone.lastTelemetry,
    };
    
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
    
    res.status(200).json(telemetryData);
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
    
    const formattedLogs = logs.map(log => ({
      timestamp: log.timestamp,
      droneId: log.droneId,
      status: log.status,
      battery: `${log.battery}%`,
      temperature: `${log.temperature}°C`,
      humidity: `${log.humidity}%`,
      speed: `${log.speed} km/h`,
      altitude: `${log.altitude}m`,
      location: log.location ? `${log.location.latitude}, ${log.location.longitude}` : 'N/A'
    }));
    
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