export interface TelemetryData {
  _id?: string;
  droneId: string;
  timestamp: Date | string;
  battery: number;
  temperature: number;
  humidity: number;
  speed: number;
  altitude: number;
  lat: number;
  lng: number;
  status: 'Standby' | 'Pre-Flight' | 'Active' | 'In Flight' | 'Landing' | 'Delivered' | 'Returning' | 'Powered Off' | 'Maintenance' | 'Emergency';
}

export interface DroneInfo {
  id: string;
  name: string;
  lastSeen: Date | string;
  status: string;
  isOnline: boolean;
  battery?: number;
}

export interface DashboardFilters {
  timeRange: '10m' | '1h' | '6h' | '24h' | '7d';
  selectedDrone: string;
}

export interface DroneControl {
  droneId: string;
  status: TelemetryData['status'];
  battery?: number;
  isOnline?: boolean;
}