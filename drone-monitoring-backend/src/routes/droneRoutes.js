const express = require('express');
const droneController = require('../controllers/droneController');

const router = express.Router();

// Get all drones with their status
router.get('/', droneController.getAllDrones);

// Get a specific drone by ID
router.get('/:id', droneController.getDroneById);

// Get historical telemetry data for a specific drone
router.get('/:id/history', droneController.getDroneHistory);

// Get mission logs
router.get('/logs/missions', droneController.getMissionLogs);

// Export mission logs as CSV
router.get('/logs/export', droneController.exportLogsAsCsv);

// Send command to a specific drone
router.post('/:id/command', droneController.sendCommandToDrone);

module.exports = router;