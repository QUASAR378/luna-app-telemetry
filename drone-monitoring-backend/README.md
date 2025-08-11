# Drone Monitoring Backend

A Node.js backend service for monitoring and managing drones via MQTT protocol.

## Features

- Real-time drone status monitoring via MQTT
- Historical telemetry data storage and retrieval
- Mission logs with time-based filtering
- CSV export functionality for mission logs
- RESTful API for frontend integration
- Google Maps integration for drone location tracking

## Prerequisites

- Node.js (v14+)
- MongoDB
- MQTT Broker (e.g., Mosquitto, HiveMQ)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `MONGODB_URI`: MongoDB connection URI
- `MQTT_BROKER_URL`: MQTT broker URL
- `MQTT_CLIENT_ID`: MQTT client identifier
- `MQTT_USERNAME`: MQTT authentication username
- `MQTT_PASSWORD`: MQTT authentication password
- `GOOGLE_MAPS_API_KEY`: API key for Google Maps integration

## Usage

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Generate mock drone data for testing:

```bash
npm run mock
```

## API Endpoints

### Drones

- `GET /api/drones`: Get all drones with their status
- `GET /api/drones/:id`: Get a specific drone by ID
- `GET /api/drones/:id/history?timeRange=<10min|6h|24h|7d>`: Get historical telemetry data for a specific drone

### Mission Logs

- `GET /api/drones/logs/missions?startDate=&endDate=&droneId=&limit=&offset=`: Get mission logs with filtering and pagination
- `GET /api/drones/logs/export?startDate=&endDate=&droneId=`: Export mission logs as CSV

### Commands

- `POST /api/drones/:id/command`: Send command to a specific drone

## MQTT Topics

- `drones/{droneId}/data`: Telemetry data from drones
- `drones/{droneId}/status`: Status updates from drones
- `drones/{droneId}/commands`: Commands sent to drones

## Data Format

### Drone Status

```json
{
  "name": "Drone Name",
  "status": "Standby",
  "timestamp": "2025-08-10T12:00:00.000Z"
}
```

### Telemetry Data

```json
{
  "status": "In Flight",
  "battery": 85.4,
  "temperature": 29.3,
  "humidity": 70.5,
  "speed": 45.2,
  "altitude": 120.5,
  "latitude": -1.3167,
  "longitude": 36.8833,
  "timestamp": "2025-08-10T12:37:10.000Z"
}
```

## License

ISC