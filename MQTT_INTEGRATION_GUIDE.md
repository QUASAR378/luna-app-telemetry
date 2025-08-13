# MQTT Integration Guide

This guide explains how the MQTT (Message Queuing Telemetry Transport) protocol is integrated into the Luna App Telemetry system for real-time drone communication.

## 🚀 **Overview**

MQTT is a lightweight messaging protocol designed for IoT devices and real-time communication. In our system, it enables:

- **Real-time telemetry streaming** from drones to the frontend
- **Instant status updates** for drone fleet monitoring
- **Live command transmission** from frontend to drones
- **Bidirectional communication** with automatic reconnection

## 🔌 **Architecture**

### **Data Flow**
```
Drones ←→ MQTT Broker ←→ Backend ←→ Frontend
   ↓           ↓           ↓         ↓
Telemetry   Messages   Processing   Display
```

### **MQTT Topics Structure**
```
drones/{droneId}/data      # Telemetry data from drones
drones/{droneId}/status    # Status updates from drones
drones/{droneId}/commands  # Commands sent to drones
drones/{droneId}/response  # Command responses from drones
```

## 🛠️ **Backend MQTT Setup**

### **1. MQTT Broker Configuration**

The backend connects to an MQTT broker (e.g., Mosquitto, HiveMQ) and provides WebSocket support for frontend connections.

```javascript
// drone-monitoring-backend/src/config/index.js
mqtt: {
  brokerUrl: 'mqtt://localhost:1883',        // TCP connection
  webSocketUrl: 'ws://localhost:9001',       // WebSocket for frontend
  topics: {
    droneData: 'drones/+/data',
    droneStatus: 'drones/+/status',
    droneCommands: 'drones/+/commands',
    droneResponse: 'drones/+/response',
  }
}
```

### **2. MQTT Service Implementation**

The backend MQTT service handles:
- **Message processing** from drones
- **Data transformation** for frontend consumption
- **Command routing** to appropriate drones
- **Connection management** and error handling

```javascript
// drone-monitoring-backend/src/services/mqttService.js
class MqttService {
  // Subscribe to drone topics
  _subscribe() {
    this.client.subscribe('drones/+/data', { qos: 1 });
    this.client.subscribe('drones/+/status', { qos: 1 });
  }
  
  // Process incoming messages
  async _handleMessage(topic, message) {
    const topicParts = topic.split('/');
    const droneId = topicParts[1];
    const messageType = topicParts[2];
    
    if (messageType === 'data') {
      await this._processTelemetryData(droneId, payload);
    } else if (messageType === 'status') {
      await this._processDroneStatus(droneId, payload);
    }
  }
}
```

## 🌐 **Frontend MQTT Integration**

### **1. MQTT Client Service**

The frontend uses a WebSocket-based MQTT client for real-time communication.

```typescript
// src/services/mqttClient.ts
class MqttService {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  
  public connect(): Promise<boolean> {
    const options: IClientOptions = {
      clientId: `luna-frontend-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      keepalive: 60,
    };
    
    this.client = mqtt.connect('ws://localhost:9001', options);
    // ... event handlers
  }
}
```

### **2. Real-time Telemetry Hook**

A React hook manages MQTT connections and data flow.

```typescript
// src/hooks/useRealTimeTelemetry.ts
export function useRealTimeTelemetry(options: UseRealTimeTelemetryOptions = {}) {
  const [state, setState] = useState<RealTimeTelemetryState>({
    drones: [],
    currentTelemetry: null,
    historicalData: [],
    isConnected: false,
    dataSource: 'fallback',
    lastUpdate: null,
    error: null,
  });

  // MQTT message handlers
  const handleDroneData = useCallback((mqttData: MqttDroneData) => {
    const telemetryData: TelemetryData = {
      _id: `mqtt_${mqttData.droneId}_${Date.now()}`,
      droneId: mqttData.droneId,
      timestamp: new Date(mqttData.timestamp),
      battery: mqttData.battery,
      temperature: mqttData.temperature,
      humidity: mqttData.humidity,
      speed: mqttData.speed,
      altitude: mqttData.altitude,
      lat: mqttData.latitude,
      lng: mqttData.longitude,
      status: mqttData.status as TelemetryData['status'],
    };

    setState(prev => ({
      ...prev,
      currentTelemetry: telemetryData,
      historicalData: [telemetryData, ...prev.historicalData.slice(0, 99)],
      lastUpdate: new Date(),
      dataSource: 'mqtt',
      isConnected: true,
    }));
  }, []);

  // ... rest of implementation
}
```

### **3. Telemetry Context Provider**

A React context provides MQTT data throughout the application.

```typescript
// src/contexts/TelemetryContext.tsx
export function TelemetryProvider({ children, options = {} }: TelemetryProviderProps) {
  const {
    drones,
    currentTelemetry,
    historicalData,
    isConnected,
    dataSource,
    lastUpdate,
    error,
    selectDrone,
    refreshData,
    sendCommand,
    mqttService,
    isMqttEnabled,
  } = useRealTimeTelemetry(options);

  // ... context implementation
}
```

## 📡 **Message Formats**

### **Drone Telemetry Data**
```json
{
  "droneId": "A1",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "battery": 85.4,
  "temperature": 29.3,
  "humidity": 70.5,
  "speed": 45.2,
  "altitude": 120.5,
  "latitude": -1.3167,
  "longitude": 36.8833,
  "status": "In Flight"
}
```

### **Drone Status Update**
```json
{
  "droneId": "A1",
  "name": "Drone A1",
  "status": "In Flight",
  "isOnline": true,
  "lastSeen": "2025-01-27T10:30:00.000Z",
  "lastLocation": {
    "latitude": -1.3167,
    "longitude": 36.8833
  },
  "lastTelemetry": {
    "battery": 85.4,
    "temperature": 29.3,
    "humidity": 70.5,
    "speed": 45.2,
    "altitude": 120.5
  }
}
```

### **Drone Command**
```json
{
  "command": "takeoff",
  "parameters": {
    "altitude": 100,
    "speed": 30
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## 🔄 **Fallback Strategy**

The system implements a multi-tier fallback strategy:

1. **Primary**: MQTT real-time data
2. **Secondary**: Backend API polling
3. **Tertiary**: Auto-simulator data
4. **Emergency**: Local state

```typescript
// Automatic fallback in telemetry service
public async getTelemetryData(params: TelemetryParams): Promise<TelemetryResult> {
  // Try MQTT first
  if (this.config.enableMQTT && this.isMqttConnected) {
    try {
      return await this.getMqttTelemetry(params);
    } catch (error) {
      console.warn('MQTT failed, falling back to API');
    }
  }

  // Fallback to API
  if (this.config.enableBackend && this.isBackendHealthy) {
    try {
      return await this.getApiTelemetry(params);
    } catch (error) {
      console.warn('API failed, falling back to simulator');
    }
  }

  // Final fallback to simulator
  if (this.config.fallbackToSimulator) {
    return await this.getSimulatorTelemetry(params);
  }

  return { logs: [], total: 0 };
}
```

## 🚀 **Setup Instructions**

### **1. Install MQTT Broker**

```bash
# Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# macOS
brew install mosquitto

# Windows
# Download from https://mosquitto.org/download/
```

### **2. Configure MQTT Broker**

```conf
# /etc/mosquitto/mosquitto.conf
listener 1883
protocol mqtt

listener 9001
protocol websockets
allow_anonymous true
```

### **3. Start MQTT Broker**

```bash
# Start MQTT broker
sudo systemctl start mosquitto

# Enable on boot
sudo systemctl enable mosquitto

# Check status
sudo systemctl status mosquitto
```

### **4. Configure Environment Variables**

```env
# Backend (.env)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_WEBSOCKET_URL=ws://localhost:9001
MQTT_ENABLE_WEBSOCKET=true
MQTT_WEBSOCKET_PORT=9001

# Frontend (.env.local)
NEXT_PUBLIC_ENABLE_MQTT=true
NEXT_PUBLIC_MQTT_BROKER_URL=ws://localhost:9001
```

### **5. Test MQTT Connection**

```bash
# Subscribe to drone data
mosquitto_sub -h localhost -t "drones/+/data" -v

# Publish test message
mosquitto_pub -h localhost -t "drones/A1/data" -m '{"battery":85,"status":"In Flight"}'
```

## 🔍 **Monitoring & Debugging**

### **MQTT Status Indicators**

The frontend displays real-time MQTT status:

- 🟢 **Live MQTT**: Real-time data streaming
- 🔵 **API Polling**: Fallback to HTTP API
- 🟡 **Simulator**: Fallback to simulated data
- 🔴 **Offline**: No data source available

### **Connection Health Monitoring**

```typescript
// MQTT connection health
const { isConnected, dataSource, lastUpdate } = useTelemetry();

// Connection status
if (isConnected && dataSource === 'mqtt') {
  console.log('✅ MQTT streaming active');
} else if (dataSource === 'polling') {
  console.log('🔄 Using API polling fallback');
} else {
  console.log('⚠️ Using simulator fallback');
}
```

### **Debug Logging**

Enable debug logging to monitor MQTT activity:

```typescript
// Console logs show MQTT activity
🔌 Connecting to MQTT broker: ws://localhost:9001
✅ Connected to MQTT broker
📡 Received MQTT drone data: { droneId: 'A1', battery: 85 }
📤 Published command to drones/A1/commands: { command: 'takeoff' }
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **MQTT Connection Failed**
   - Check if MQTT broker is running
   - Verify WebSocket port (9001) is accessible
   - Check firewall settings

2. **No Real-time Updates**
   - Verify MQTT topics are correct
   - Check drone data is being published
   - Monitor MQTT broker logs

3. **High Latency**
   - Check network connectivity
   - Verify MQTT broker performance
   - Consider QoS settings

### **Debug Commands**

```bash
# Check MQTT broker status
sudo systemctl status mosquitto

# View MQTT broker logs
sudo tail -f /var/log/mosquitto/mosquitto.log

# Test WebSocket connection
wscat -c ws://localhost:9001

# Monitor MQTT traffic
mosquitto_sub -h localhost -t "#" -v
```

## 📊 **Performance Optimization**

### **Connection Management**

- **Automatic reconnection** with exponential backoff
- **Connection pooling** for multiple frontend instances
- **Heartbeat monitoring** for connection health

### **Data Efficiency**

- **Message compression** for large telemetry data
- **Batch processing** for multiple drone updates
- **Selective subscriptions** based on user needs

### **Scalability**

- **Load balancing** across multiple MQTT brokers
- **Topic partitioning** for large drone fleets
- **Message persistence** for offline scenarios

## 🔮 **Future Enhancements**

### **Planned Features**

1. **MQTT over TLS** for secure communication
2. **Message persistence** for offline drones
3. **Advanced filtering** and topic routing
4. **Performance metrics** and analytics
5. **Multi-broker support** for high availability

### **Integration Possibilities**

- **Cloud MQTT services** (AWS IoT, Azure IoT Hub)
- **Edge computing** with local MQTT brokers
- **5G networks** for low-latency communication
- **Satellite communication** for remote operations

## 📚 **Additional Resources**

- [MQTT Protocol Specification](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html)
- [Mosquitto MQTT Broker](https://mosquitto.org/)
- [MQTT.js Client Library](https://github.com/mqttjs/MQTT.js)
- [IoT MQTT Best Practices](https://www.hivemq.com/blog/mqtt-essentials-part-1-introducing-mqtt/)

---

This MQTT integration provides a robust, real-time communication foundation for the drone telemetry system, ensuring reliable data transmission with intelligent fallback mechanisms. 