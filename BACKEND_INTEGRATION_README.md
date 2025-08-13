# Backend Integration Setup

This document explains how to set up the connection between the frontend and backend for the Luna App Telemetry system.

## 🚀 Quick Start

### 1. Start the Backend Server

First, start the drone monitoring backend:

```bash
cd drone-monitoring-backend
npm install
npm run dev
```

The backend will start on `http://localhost:3000` by default.

### 2. Configure Frontend Environment

Create a `.env.local` file in the root directory with the following configuration:

```env
# Backend API Configuration
NEXT_PUBLIC_API_BASE=http://localhost:3000
NEXT_PUBLIC_ENABLE_BACKEND=true
NEXT_PUBLIC_ENABLE_SIMULATOR=true
NEXT_PUBLIC_ENABLE_FALLBACKS=true

# MQTT Configuration (optional)
NEXT_PUBLIC_ENABLE_MQTT=false
NEXT_PUBLIC_MQTT_BROKER_URL=ws://localhost:9001

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES=true
NEXT_PUBLIC_ENABLE_HISTORICAL_DATA=true
NEXT_PUBLIC_ENABLE_DRONE_CONTROL=true

# Development Settings
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=info
```

### 3. Start the Frontend

```bash
npm run dev
```

The frontend will start on `http://localhost:3001` (or next available port).

## 🔧 How It Works

### Data Flow Architecture

```
Frontend (Next.js) ←→ TelemetryService ←→ Backend (Node.js + Express)
                           ↓
                    Auto-Simulator (Fallback)
```

### Service Layers

1. **TelemetryService**: Main orchestrator that manages data sources
2. **API Service**: Handles HTTP communication with backend
3. **Auto-Simulator**: Provides fallback data when backend is unavailable
4. **Configuration**: Centralized settings management

### Fallback Strategy

The system automatically falls back to different data sources:

1. **Primary**: Backend API (real-time data)
2. **Secondary**: Auto-simulator (simulated data)
3. **Tertiary**: Local state (basic fallback)

## 📊 Backend Endpoints

The backend provides these key endpoints:

- `GET /api/drones` - Get all drones with status
- `GET /api/drones/:id` - Get specific drone details
- `GET /api/drones/:id/history` - Get drone telemetry history
- `GET /api/drones/telemetry/data` - Get telemetry data with filtering
- `POST /api/drones/:id/command` - Send commands to drones
- `GET /api/health` - Backend health check

## 🔍 Monitoring & Debugging

### Backend Status Indicators

The dashboard shows real-time backend connectivity status:

- 🟢 **Backend Connected**: Live data from backend
- 🟡 **Using Simulator**: Fallback to simulated data
- 🔴 **Fallback Data**: Emergency fallback mode

### Console Logging

Enable debug logging by setting `NEXT_PUBLIC_DEBUG_MODE=true`:

```bash
# Backend connection attempts
🔄 Fetching drones from backend...
✅ Retrieved 4 drones from backend

# Fallback activations
⚠️ Backend drone fetch failed, using fallback
🔄 Using auto-simulator fallback for drones...
✅ Retrieved 4 drones from simulator
```

## 🛠️ Troubleshooting

### Common Issues

1. **Backend Not Starting**
   - Check if MongoDB is running
   - Verify MQTT broker connection
   - Check backend logs in `drone-monitoring-backend/logs/`

2. **Frontend Can't Connect**
   - Verify backend is running on correct port
   - Check CORS configuration
   - Verify environment variables

3. **Data Not Updating**
   - Check backend health endpoint
   - Verify MQTT connections
   - Check auto-simulator status

### Debug Commands

```bash
# Check backend health
curl http://localhost:3000/health

# Check backend logs
tail -f drone-monitoring-backend/logs/combined.log

# Check frontend environment
echo $NEXT_PUBLIC_API_BASE
```

## 🔄 Data Synchronization

### Real-time Updates

- **Drones**: Updated every 10 seconds
- **Telemetry**: Updated every 15 seconds
- **Health Check**: Every 30 seconds

### Data Transformation

The service automatically transforms backend data to match frontend expectations:

```typescript
// Backend format
{
  id: "A1",
  isOnline: "ONLINE",
  lastTelemetry: { battery: 85 }
}

// Frontend format
{
  id: "A1",
  isOnline: true,
  battery: 85
}
```

## 🎯 Advanced Configuration

### Custom Fallback Intervals

```typescript
// In src/config/backend.ts
fallbacks: {
  simulatorInterval: 15000,    // 15 seconds
  healthCheckInterval: 30000,  // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,           // 1 second
}
```

### Feature Toggles

```typescript
// Disable specific features
NEXT_PUBLIC_ENABLE_BACKEND=false      // Use simulator only
NEXT_PUBLIC_ENABLE_SIMULATOR=false    // Use backend only
NEXT_PUBLIC_ENABLE_FALLBACKS=false   // No fallbacks
```

## 🚀 Production Deployment

### Environment Variables

```env
# Production backend
NEXT_PUBLIC_API_BASE=https://your-backend-domain.com
NEXT_PUBLIC_ENABLE_BACKEND=true
NEXT_PUBLIC_ENABLE_SIMULATOR=false
NEXT_PUBLIC_ENABLE_FALLBACKS=false
```

### Health Monitoring

The system includes built-in health monitoring:

- Automatic backend connectivity checks
- Graceful degradation on failures
- Comprehensive error logging
- Performance metrics collection

## 📚 API Reference

For detailed API documentation, see the backend README in `drone-monitoring-backend/README.md`.

## 🤝 Contributing

When adding new features:

1. Update the telemetry service for new data types
2. Add appropriate fallback handling
3. Update configuration options
4. Add health checks for new endpoints
5. Document new environment variables

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review backend and frontend logs
3. Verify environment configuration
4. Check network connectivity
5. Review MQTT broker status 