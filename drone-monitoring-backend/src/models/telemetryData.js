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
  // Support both location structure (backend) and lat/lng (frontend)
  location: {
    latitude: Number,
    longitude: Number,
  },
  // Frontend-compatible lat/lng fields
  lat: Number,
  lng: Number,
  status: {
    type: String,
    enum: [
      'Standby', 
      'Pre-Flight', 
      'Active', 
      'In Flight', 
      'Landing', 
      'Delivered', 
      'Returning', 
      'Powered Off', 
      'Maintenance', 
      'Emergency'
    ],
    default: 'Standby',
  },
}, {
  timestamps: true,
});

// Index for efficient time-based queries
telemetryDataSchema.index({ timestamp: -1, droneId: 1 });

// Pre-save middleware to ensure lat/lng are populated from location
telemetryDataSchema.pre('save', function(next) {
  if (this.location && this.location.latitude && this.location.longitude) {
    this.lat = this.location.latitude;
    this.lng = this.location.longitude;
  }
  next();
});

// Method to get frontend-compatible data
telemetryDataSchema.methods.toFrontendFormat = function() {
  return {
    _id: this._id,
    droneId: this.droneId,
    timestamp: this.timestamp,
    battery: this.battery,
    temperature: this.temperature,
    humidity: this.humidity,
    speed: this.speed,
    altitude: this.altitude,
    lat: this.lat || this.location?.latitude || 0,
    lng: this.lng || this.location?.longitude || 0,
    status: this.status,
  };
};

const TelemetryData = mongoose.model('TelemetryData', telemetryDataSchema);

module.exports = TelemetryData;