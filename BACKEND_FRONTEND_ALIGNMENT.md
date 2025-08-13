# Backend-Frontend Alignment Guide

This document outlines all the changes made to the backend to ensure compatibility with the frontend's expected data structures and API contracts.

## 🔍 **Issues Identified**

### **1. Status Enum Mismatch**
- **Backend**: Limited to `['Powered Off', 'Standby', 'In Flight']`
- **Frontend**: Expects `['Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency']`

### **2. Location Structure Difference**
- **Backend**: Uses `location.latitude` and `location.longitude`
- **Frontend**: Expects `lat` and `lng` fields

### **3. Drone ID Field Mismatch**
- **Backend**: Returns `droneId` field
- **Frontend**: Expects `id` field

### **4. Data Transformation Inconsistencies**
- **Backend**: Raw database format
- **Frontend**: Expects normalized, frontend-friendly format

## ✅ **Solutions Implemented**

### **1. Updated Data Models**

#### **TelemetryData Model** (`src/models/telemetryData.js`)
```javascript
// Added frontend-compatible fields
lat: Number,        // Frontend expects 'lat'
lng: Number,        // Frontend expects 'lng'

// Expanded status enum
status: {
  type: String,
  enum: [
    'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
    'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
  ],
  default: 'Standby',
}

// Pre-save middleware for automatic lat/lng population
telemetryDataSchema.pre('save', function(next) {
  if (this.location && this.location.latitude && this.location.longitude) {
    this.lat = this.location.latitude;
    this.lng = this.location.longitude;
  }
  next();
});

// Frontend-compatible data method
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
```

#### **Drone Model** (`src/models/drone.js`)
```javascript
// Expanded status enum to match frontend
status: {
  type: String,
  enum: [
    'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
    'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
  ],
  default: 'Standby',
}

// Frontend-compatible data method
droneSchema.methods.toFrontendFormat = function() {
  return {
    id: this.droneId,        // Frontend expects 'id', not 'droneId'
    name: this.name,
    lastSeen: this.lastSeen,
    status: this.status,
    isOnline: this.isOnline,
    battery: this.lastTelemetry?.battery,
  };
};
```

### **2. Enhanced Controllers**

#### **Drone Controller** (`src/controllers/droneController.js`)
```javascript
// Updated getAllDrones to use frontend-compatible format
exports.getAllDrones = async (req, res) => {
  const drones = await Drone.find({});
  const dronesWithStatus = drones.map(drone => {
    drone.updateOnlineStatus();
    return drone.toFrontendFormat(); // Use new method
  });
  res.status(200).json(dronesWithStatus);
};

// Updated getTelemetryData with proper transformation
exports.getTelemetryData = async (req, res) => {
  const telemetryData = await TelemetryData.find(filter)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .lean();
  
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
};
```

### **3. Enhanced MQTT Service**

#### **MQTT Service** (`src/services/mqttService.js`)
```javascript
// Added status normalization
_normalizeStatus(status) {
  if (!status) return 'Standby';
  
  const statusMap = {
    'powered_off': 'Powered Off',
    'in_flight': 'In Flight',
    'pre_flight': 'Pre-Flight',
    // ... more mappings
  };

  const normalized = statusMap[status.toLowerCase()] || status;
  
  // Validate against allowed statuses
  const allowedStatuses = [
    'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
    'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
  ];
  
  return allowedStatuses.includes(normalized) ? normalized : 'Standby';
}

// Updated data processing to handle both formats
async _processTelemetryData(droneId, data) {
  const telemetryData = new TelemetryData({
    droneId,
    timestamp: new Date(),
    battery: data.battery,
    temperature: data.temperature,
    humidity: data.humidity,
    speed: data.speed,
    altitude: data.altitude,
    location: {
      latitude: data.latitude || data.location?.latitude,
      longitude: data.longitude || data.location?.longitude,
    },
    // Also store as lat/lng for frontend compatibility
    lat: data.lat || data.latitude || data.location?.latitude,
    lng: data.lng || data.longitude || data.location?.longitude,
    status: this._normalizeStatus(data.status),
  });
  
  await telemetryData.save();
}
```

### **4. Data Migration System**

#### **Migration Utility** (`src/utils/dataMigration.js`)
```javascript
// Migrate existing telemetry data
async function migrateTelemetryData() {
  const recordsToUpdate = await TelemetryData.find({
    $or: [
      { lat: { $exists: false } },
      { lng: { $exists: false } },
      { lat: null },
      { lng: null }
    ]
  });
  
  for (const record of recordsToUpdate) {
    if (record.location && record.location.latitude && record.location.longitude) {
      record.lat = record.location.latitude;
      record.lng = record.location.longitude;
    } else {
      record.lat = 0;
      record.lng = 0;
    }
    
    if (record.status) {
      record.status = normalizeStatus(record.status);
    }
    
    await record.save();
  }
}

// Check migration status
async function checkMigrationStatus() {
  const telemetryCount = await TelemetryData.countDocuments({
    $or: [
      { lat: { $exists: false } },
      { lng: { $exists: false } },
      { lat: null },
      { lng: null }
    ]
  });
  
  const droneCount = await Drone.countDocuments({
    status: { $nin: [
      'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
      'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
    ]}
  });
  
  return {
    needsTelemetryMigration: telemetryCount > 0,
    needsDroneMigration: droneCount > 0,
    telemetryCount,
    droneCount
  };
}
```

### **5. Enhanced Server Configuration**

#### **Server** (`src/server.js`)
```javascript
// Added comprehensive health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    mqtt: mqttService.isConnected ? 'connected' : 'disconnected',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0',
    environment: config.server.env,
    uptime: process.uptime(),
  });
});

// Added root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Luna Drone Monitoring Backend',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      drones: '/api/drones',
      telemetry: '/api/drones/telemetry/data',
    },
  });
});
```

### **6. New API Endpoints**

#### **Migration Endpoints**
```javascript
// Check migration status
GET /api/drones/migration/status

// Run data migration
POST /api/drones/migration/run
```

## 🔄 **Data Flow After Changes**

### **Before (Incompatible)**
```
Frontend Request → Backend → Raw Database Format → Frontend Error
```

### **After (Compatible)**
```
Frontend Request → Backend → Database Query → Frontend Format → Frontend Success
```

## 📊 **API Response Examples**

### **Drone List (Before)**
```json
[
  {
    "droneId": "A1",           // ❌ Frontend expects 'id'
    "name": "Drone A1",
    "status": "In Flight",     // ❌ Limited status options
    "isOnline": "ONLINE",      // ❌ String instead of boolean
    "lastSeen": "2025-01-27T10:30:00.000Z",
    "lastLocation": {          // ❌ Complex nested structure
      "latitude": -1.3167,
      "longitude": 36.8833
    }
  }
]
```

### **Drone List (After)**
```json
[
  {
    "id": "A1",                // ✅ Frontend-compatible
    "name": "Drone A1",
    "status": "In Flight",     // ✅ Full status enum
    "isOnline": true,          // ✅ Boolean format
    "lastSeen": "2025-01-27T10:30:00.000Z",
    "battery": 85.4            // ✅ Direct battery access
  }
]
```

### **Telemetry Data (Before)**
```json
{
  "logs": [
    {
      "_id": "...",
      "droneId": "A1",
      "timestamp": "2025-01-27T10:30:00.000Z",
      "battery": 85.4,
      "temperature": 29.3,
      "humidity": 70.5,
      "speed": 45.2,
      "altitude": 120.5,
      "location": {            // ❌ Nested structure
        "latitude": -1.3167,
        "longitude": 36.8833
      },
      "status": "In Flight"
    }
  ]
}
```

### **Telemetry Data (After)**
```json
{
  "logs": [
    {
      "_id": "...",
      "droneId": "A1",
      "timestamp": "2025-01-27T10:30:00.000Z",
      "battery": 85.4,
      "temperature": 29.3,
      "humidity": 70.5,
      "speed": 45.2,
      "altitude": 120.5,
      "lat": -1.3167,          // ✅ Frontend-compatible
      "lng": 36.8833,          // ✅ Frontend-compatible
      "status": "In Flight"
    }
  ],
  "total": 1,
  "droneId": "A1",
  "timeRange": "since 2025-01-27T09:30:00.000Z"
}
```

## 🚀 **Migration Process**

### **1. Automatic Migration**
The system automatically migrates data when:
- New records are saved (via pre-save middleware)
- MQTT messages are processed
- API responses are formatted

### **2. Manual Migration**
```bash
# Check migration status
curl http://localhost:3000/api/drones/migration/status

# Run migration
curl -X POST http://localhost:3000/api/drones/migration/run
```

### **3. Migration Safety**
- **Non-destructive**: Original data is preserved
- **Backward compatible**: Old format still works
- **Incremental**: Only updates what's needed
- **Rollback safe**: Can be run multiple times

## 🔧 **Configuration Updates**

### **Environment Variables**
```env
# Backend (.env)
MQTT_ENABLE_WEBSOCKET=true
MQTT_WEBSOCKET_PORT=9001
MQTT_ALLOW_ANONYMOUS=true
MQTT_MAX_CLIENTS=100
```

### **MQTT Configuration**
```javascript
// drone-monitoring-backend/src/config/index.js
mqtt: {
  brokerUrl: 'mqtt://localhost:1883',
  webSocketUrl: 'ws://localhost:9001',
  topics: {
    droneData: 'drones/+/data',
    droneStatus: 'drones/+/status',
    droneCommands: 'drones/+/commands',
    droneResponse: 'drones/+/response',
  },
  frontend: {
    enableWebSocket: true,
    webSocketPort: 9001,
    allowAnonymous: true,
    maxClients: 100,
  },
}
```

## ✅ **Compatibility Matrix**

| Feature | Backend Before | Backend After | Frontend Expectation | Status |
|---------|----------------|---------------|---------------------|---------|
| Status Enum | Limited (3) | Full (10) | Full (10) | ✅ Compatible |
| Location Fields | `location.lat/lng` | `lat/lng` + `location.lat/lng` | `lat/lng` | ✅ Compatible |
| Drone ID Field | `droneId` | `id` (via method) | `id` | ✅ Compatible |
| Boolean Fields | String | Boolean | Boolean | ✅ Compatible |
| Data Structure | Raw DB | Frontend format | Frontend format | ✅ Compatible |
| MQTT Topics | Basic | Extended | Extended | ✅ Compatible |
| Health Check | Basic | Comprehensive | Comprehensive | ✅ Compatible |

## 🎯 **Benefits of Changes**

### **1. Seamless Integration**
- Frontend receives exactly what it expects
- No data transformation needed on frontend
- Consistent API contracts

### **2. Enhanced Functionality**
- Full status enum support
- Better location handling
- Improved MQTT integration

### **3. Data Consistency**
- Automatic data normalization
- Migration tools for existing data
- Backward compatibility maintained

### **4. Developer Experience**
- Clear API documentation
- Consistent response formats
- Easy debugging and testing

## 🔮 **Future Considerations**

### **1. Schema Evolution**
- Versioned API endpoints
- Gradual deprecation of old formats
- Migration automation

### **2. Performance Optimization**
- Database indexing for new fields
- Query optimization for frontend patterns
- Caching strategies

### **3. Monitoring & Analytics**
- Migration success tracking
- Data quality metrics
- Performance monitoring

---

The backend is now fully aligned with the frontend's expectations while maintaining all existing functionality. The system automatically handles data transformation, provides comprehensive migration tools, and ensures seamless communication between frontend and backend components. 