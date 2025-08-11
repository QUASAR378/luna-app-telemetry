const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Powered Off', 'Standby', 'In Flight'],
    default: 'Powered Off',
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  lastLocation: {
    latitude: Number,
    longitude: Number,
  },
  lastTelemetry: {
    battery: Number,
    temperature: Number,
    humidity: Number,
    speed: Number,
    altitude: Number,
  },
}, {
  timestamps: true,
});

// Method to determine if drone is online based on last seen time
droneSchema.methods.updateOnlineStatus = function() {
  const offlineThreshold = 2 * 60 * 1000; // 2 minutes
  this.isOnline = (Date.now() - this.lastSeen) < offlineThreshold;
  return this.isOnline;
};

const Drone = mongoose.model('Drone', droneSchema);

module.exports = Drone;