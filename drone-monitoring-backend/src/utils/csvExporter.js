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
  const csvData = logs.map(log => ({
    timestamp: moment(log.timestamp).format('DD/MM/YYYY, HH:mm:ss'),
    droneId: log.droneId,
    status: log.status,
    battery: `${log.battery.toFixed(2)}%`,
    temperature: `${log.temperature.toFixed(1)}°C`,
    humidity: `${log.humidity.toFixed(1)}%`,
    speed: `${log.speed.toFixed(1)} km/h`,
    altitude: `${log.altitude.toFixed(1)}m`,
    location: log.location ? `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}` : 'N/A',
  }));

  // Generate CSV
  return stringify(csvData, { header: true, columns });
};