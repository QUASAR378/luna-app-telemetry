// This model is no longer used in the frontend
// The frontend now connects to the backend for all database operations
// This file is kept for reference but commented out to prevent errors

/*
import mongoose from 'mongoose';

const TelemetrySchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  battery: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  speed: {
    type: Number,
    required: true,
    min: 0
  },
  altitude: {
    type: Number,
    required: true
  },
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  status: {
    type: String,
    required: true,
    enum: [ "Idle",'Standby' , 'Pre-Flight' , 'Active' , 'In Flight' , 'Landing' , 'Delivered' , 'Returning' , 'Powered Off' , 'Maintenance' , 'Emergency']
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
TelemetrySchema.index({ droneId: 1, timestamp: -1 });

export default mongoose.models.Telemetry || mongoose.model('Telemetry', TelemetrySchema);
*/

// Placeholder export to prevent import errors
export default null;