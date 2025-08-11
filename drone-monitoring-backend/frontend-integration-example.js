/**
 * Example script showing how to integrate the drone monitoring backend with the frontend
 * This can be used as a reference for implementing the actual frontend integration
 */

// API base URL (update with your actual backend URL)
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Fetch all drones with their status
 * @returns {Promise<Array>} Array of drone objects
 */
async function getAllDrones() {
  try {
    const response = await fetch(`${API_BASE_URL}/drones`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching drones:', error);
    return [];
  }
}

/**
 * Fetch a specific drone by ID
 * @param {string} droneId - ID of the drone
 * @returns {Promise<Object>} Drone object
 */
async function getDroneById(droneId) {
  try {
    const response = await fetch(`${API_BASE_URL}/drones/${droneId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching drone ${droneId}:`, error);
    return null;
  }
}

/**
 * Fetch historical data for a specific drone
 * @param {string} droneId - ID of the drone
 * @param {string} timeRange - Time range (10min, 6h, 24h, 7d)
 * @returns {Promise<Array>} Array of telemetry data points
 */
async function getDroneHistory(droneId, timeRange) {
  try {
    const response = await fetch(`${API_BASE_URL}/drones/${droneId}/history?timeRange=${timeRange}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching history for drone ${droneId}:`, error);
    return [];
  }
}

/**
 * Fetch mission logs with filtering and pagination
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Object>} Mission logs with pagination data
 */
async function getMissionLogs({ startDate, endDate, droneId, limit = 100, offset = 0 }) {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (droneId) params.append('droneId', droneId);
    params.append('limit', limit);
    params.append('offset', offset);
    
    const response = await fetch(`${API_BASE_URL}/drones/logs/missions?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching mission logs:', error);
    return { logs: [], pagination: { total: 0, limit, offset, hasMore: false } };
  }
}

/**
 * Get URL for CSV export of mission logs
 * @param {Object} options - Filter options
 * @returns {string} URL for CSV download
 */
function getMissionLogsExportUrl({ startDate, endDate, droneId }) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (droneId) params.append('droneId', droneId);
  
  return `${API_BASE_URL}/drones/logs/export?${params}`;
}

/**
 * Send command to a drone
 * @param {string} droneId - ID of the drone
 * @param {string} command - Command to send
 * @param {Object} parameters - Command parameters
 * @returns {Promise<Object>} Command result
 */
async function sendCommandToDrone(droneId, command, parameters) {
  try {
    const response = await fetch(`${API_BASE_URL}/drones/${droneId}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, parameters }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error sending command to drone ${droneId}:`, error);
    return { success: false, error: error.message };
  }
}

// Example usage:
// These examples show how the frontend can use the backend API

async function exampleUsage() {
  // 1. Get all drones to display in the operations section
  const allDrones = await getAllDrones();
  console.log('All drones:', allDrones);
  
  // 2. Get historical data for a specific drone for the last 10 minutes
  if (allDrones.length > 0) {
    const droneId = allDrones[0].id;
    const last10MinData = await getDroneHistory(droneId, '10min');
    console.log(`Last 10 minutes data for drone ${droneId}:`, last10MinData);
    
    // 3. Get historical data for different time periods
    const last6HrsData = await getDroneHistory(droneId, '6h');
    console.log(`Last 6 hours data for drone ${droneId}:`, last6HrsData.length, 'data points');
    
    const last24HrsData = await getDroneHistory(droneId, '24h');
    console.log(`Last 24 hours data for drone ${droneId}:`, last24HrsData.length, 'data points');
    
    const last7DaysData = await getDroneHistory(droneId, '7d');
    console.log(`Last 7 days data for drone ${droneId}:`, last7DaysData.length, 'data points');
  }
  
  // 4. Get mission logs with filtering
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const missionLogs = await getMissionLogs({
    startDate: yesterday.toISOString(),
    limit: 50,
  });
  console.log('Mission logs:', missionLogs);
  
  // 5. Get URL for CSV export
  const csvExportUrl = getMissionLogsExportUrl({
    startDate: yesterday.toISOString(),
  });
  console.log('CSV Export URL:', csvExportUrl);
  
  // 6. Send command to drone (example)
  if (allDrones.length > 0) {
    const droneId = allDrones[0].id;
    const commandResult = await sendCommandToDrone(droneId, 'takeOff', { altitude: 50 });
    console.log('Command result:', commandResult);
  }
}

// Call the example function
// exampleUsage().catch(console.error);

// Export functions for use in the frontend application
export {
  getAllDrones,
  getDroneById,
  getDroneHistory,
  getMissionLogs,
  getMissionLogsExportUrl,
  sendCommandToDrone
};