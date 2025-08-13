const { stringify } = require('csv-stringify/sync');
const moment = require('moment');

/**
 * Format telemetry data logs as CSV
 * @param {Array} logs - Array of telemetry data logs
 * @returns {String} CSV formatted string
 */
exports.formatLogsAsCsv = (logs) => {
  // Define columns for CSV
  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'droneId', header: 'Drone ID' },
    { key: 'status', header: 'Status' },
    { key: 'battery', header: 'Battery' },
    { key: 'temperature', header: 'Temp' },
    { key: 'humidity', header: 'Humidity' },
    { key: 'speed', header: 'Speed' },
    { key: 'altitude', header: 'Altitude' },
    { key: 'location', header: 'Location' },
  ];

  // Format data for CSV
  const csvData = logs.map(log => {
    // Handle both old and new data structures
    let location = 'N/A';
    
    if (log.lat && log.lng) {
      // New structure with lat/lng
      location = `${log.lat.toFixed(4)}, ${log.lng.toFixed(4)}`;
    } else if (log.location && log.location.latitude && log.location.longitude) {
      // Old structure with location object
      location = `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}`;
    }
    
    return {
      timestamp: moment(log.timestamp).format('DD/MM/YYYY, HH:mm:ss'),
      droneId: log.droneId,
      status: log.status,
      battery: log.battery ? `${log.battery.toFixed(2)}%` : 'N/A',
      temperature: log.temperature ? `${log.temperature.toFixed(1)}°C` : 'N/A',
      humidity: log.humidity ? `${log.humidity.toFixed(1)}%` : 'N/A',
      speed: log.speed ? `${log.speed.toFixed(1)} km/h` : 'N/A',
      altitude: log.altitude ? `${log.altitude.toFixed(1)}m` : 'N/A',
      location: location,
    };
  });

  // Generate CSV
  return stringify(csvData, { header: true, columns });
};