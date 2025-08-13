import axios from "axios";

// Backend configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api"; // Updated to port 3001
const BACKEND_TIMEOUT = 10000; // 10 seconds

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: BACKEND_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Backend connection timeout - using fallback data');
    }
    if (error.response?.status === 404) {
      throw new Error('Backend endpoint not found - using fallback data');
    }
    if (error.response?.status >= 500) {
      throw new Error('Backend server error - using fallback data');
    }
    throw error;
  }
);

// Health check to verify backend connectivity
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
};

// Drone-related API calls
export const getDrones = async () => {
  const response = await apiClient.get('/drones');
  return response.data;
};

export const getDroneById = async (id: string) => {
  const response = await apiClient.get(`/drones/${id}`);
  return response.data;
};

export const getDroneHistory = async (id: string, timeRange: string) => {
  const response = await apiClient.get(`/drones/${id}/history?timeRange=${timeRange}`);
  return response.data;
};

// Telemetry-related API calls
export const getTelemetry = async (params?: {
  droneId?: string;
  since?: string;
  limit?: number;
  status?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.droneId) queryParams.append('droneId', params.droneId);
  if (params?.since) queryParams.append('since', params.since);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  
  const response = await apiClient.get(`/drones/telemetry/data?${queryParams.toString()}`);
  return response.data;
};

// Mission logs API calls
export const getMissionLogs = async (params?: {
  startDate?: string;
  endDate?: string;
  droneId?: string;
  limit?: number;
  offset?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.droneId) queryParams.append('droneId', params.droneId);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const response = await apiClient.get(`/drones/logs/missions?${queryParams.toString()}`);
  return response.data;
};

export const exportMissionLogs = async (params?: {
  startDate?: string;
  endDate?: string;
  droneId?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.droneId) queryParams.append('droneId', params.droneId);
  
  const response = await apiClient.get(`/drones/logs/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Drone control API calls
export const sendCommand = async (droneId: string, command: string, parameters?: any) => {
  const response = await apiClient.post(`/drones/${droneId}/command`, {
    command,
    parameters,
  });
  return response.data;
};

// Legacy methods (kept for compatibility)
export const getTelemetryLegacy = async () => {
  const res = await apiClient.get(`/drones/telemetry/data`);
  return res.data;
};

export const sendCommandLegacy = async (cmd: { type: string; value: string }) => {
  // This would need to be adapted based on your command structure
  const res = await apiClient.post(`/drones/commands`, cmd);
  return res.data;
};
