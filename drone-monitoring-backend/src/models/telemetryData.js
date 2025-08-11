const mongoose = require('mongoose');

const telemetryDataSchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  battery: {
    type: Number,
    min: 0,
    max: 100,
  },
  temperature: {
    type: Number,
  },
  humidity: {
    type: Number,
    min: 0,
    max: 100,
  },
  speed: {
    type: Number,
    min: 0,
  },
  altitude: {
    type: Number,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  status: {
    type: String,
    enum: ['Powered Off', 'Standby', 'In Flight'],
    default: 'Powered Off',
  },
});

// Index for efficient time-based queries
telemetryDataSchema.index({ timestamp: -1, droneId: 1 });

const TelemetryData = mongoose.model('TelemetryData', telemetryDataSchema);

module.exports = TelemetryData;