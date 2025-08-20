// Backend configuration
export const BACKEND_CONFIG = {
  // Backend server settings
  server: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000',
    apiPath: '/api',
    healthEndpoint: '/health',
    timeout: 10000, // 10 seconds
  },
  
  // MQTT settings (if needed for frontend)
  mqtt: {
    brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:9001',
    clientId: `luna-frontend-${Math.random().toString(16).substr(2, 8)}`,
    topics: {
      droneData: 'drones/+/data',
      droneStatus: 'drones/+/status',
      droneCommands: 'drones/+/commands',
    },
  },
  
  // Feature flags
  features: {
    enableBackend: process.env.NEXT_PUBLIC_ENABLE_BACKEND !== 'false',
    enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== 'false',
    enableSimulator: process.env.NEXT_PUBLIC_ENABLE_SIMULATOR !== 'false',
    enableFallbacks: process.env.NEXT_PUBLIC_ENABLE_FALLBACKS !== 'false',
  },
  
  // Fallback settings
  fallbacks: {
    simulatorInterval: 15000, // 15 seconds
    healthCheckInterval: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  
  // Data transformation settings
  data: {
    maxTelemetryRecords: 1000,
    defaultTimeRange: '1h',
    updateIntervals: {
      drones: 10000, // 10 seconds
      telemetry: 15000, // 15 seconds
      health: 30000, // 30 seconds
    },
  },
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = BACKEND_CONFIG.server.baseUrl;
  const apiPath = BACKEND_CONFIG.server.apiPath;
  return `${baseUrl}${apiPath}${endpoint}`;
};

// Helper function to check if backend is enabled
export const isBackendEnabled = (): boolean => {
  return BACKEND_CONFIG.features.enableBackend;
};

// Helper function to check if WebSocket is enabled
export const isWebSocketEnabled = (): boolean => {
  return BACKEND_CONFIG.features.enableWebSocket;
};

// Helper function to check if simulator is enabled
export const isSimulatorEnabled = (): boolean => {
  return BACKEND_CONFIG.features.enableSimulator;
};

// Helper function to check if fallbacks are enabled
export const areFallbacksEnabled = (): boolean => {
  return BACKEND_CONFIG.features.enableFallbacks;
};