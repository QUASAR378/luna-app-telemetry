import { 
  getDrones, 
  getTelemetry, 
  getDroneHistory, 
  checkBackendHealth 
} from './api';
import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { BACKEND_CONFIG } from '@/config/backend';

// Fallback data generation (existing functionality)
import { getAutoSimulator } from '@/lib/auto-simulator';

interface TelemetryServiceConfig {
  enableBackend: boolean;
  fallbackToSimulator: boolean;
  healthCheckInterval: number;
  retryAttempts: number;
}

class TelemetryService {
  private config: TelemetryServiceConfig;
  private isBackendHealthy: boolean = false;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private autoSimulator: any;

  constructor(config: Partial<TelemetryServiceConfig> = {}) {
    this.config = {
      enableBackend: BACKEND_CONFIG.features.enableBackend,
      fallbackToSimulator: BACKEND_CONFIG.features.enableSimulator,
      healthCheckInterval: BACKEND_CONFIG.fallbacks.healthCheckInterval,
      retryAttempts: BACKEND_CONFIG.fallbacks.retryAttempts,
      ...config,
    };

    this.autoSimulator = getAutoSimulator();
    this.startHealthCheck();
  }

  private async startHealthCheck() {
    if (!this.config.enableBackend) return;

    const checkHealth = async () => {
      try {
        this.isBackendHealthy = await checkBackendHealth();
        console.log(`Backend health check: ${this.isBackendHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      } catch (error) {
        this.isBackendHealthy = false;
        console.warn('Backend health check failed:', error);
      }
    };

    // Initial check
    await checkHealth();

    // Periodic health checks
    this.healthCheckTimer = setInterval(checkHealth, this.config.healthCheckInterval);
  }

  public stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  public isBackendAvailable(): boolean {
    return this.isBackendHealthy;
  }

  // Get drones with backend fallback
  public async getDrones(): Promise<DroneInfo[]> {
    if (this.config.enableBackend && this.isBackendHealthy) {
      try {
        console.log('🔄 Fetching drones from backend...');
        const drones = await getDrones();
        
        // Transform backend data to match frontend expectations
        const transformedDrones = drones.map((drone: any) => ({
          id: drone.id,
          name: drone.name,
          lastSeen: new Date(drone.lastSeen),
          status: drone.status,
          isOnline: drone.isOnline === 'ONLINE',
          battery: drone.lastTelemetry?.battery,
        }));
        
        console.log(`✅ Retrieved ${transformedDrones.length} drones from backend`);
        return transformedDrones;
      } catch (error) {
        console.warn('⚠️ Backend drone fetch failed, using fallback:', error);
      }
    }

    // Fallback: Use auto-simulator data
    if (this.config.fallbackToSimulator) {
      console.log('🔄 Using auto-simulator fallback for drones...');
      try {
        const status = this.autoSimulator.getStatus();
        const fallbackDrones: DroneInfo[] = status.profiles.map((profile: any) => ({
          id: profile.id,
          name: profile.name,
          lastSeen: new Date(),
          status: this.mapSimulatorStatus(profile.phase),
          isOnline: true,
          battery: profile.currentBattery,
        }));
        
        console.log(`✅ Retrieved ${fallbackDrones.length} drones from simulator`);
        return fallbackDrones;
      } catch (error) {
        console.error('❌ Simulator fallback failed:', error);
      }
    }

    // Final fallback: Return empty array
    console.warn('⚠️ All data sources failed, returning empty drone list');
    return [];
  }

  // Get telemetry data with backend fallback
  public async getTelemetryData(params: {
    droneId?: string;
    since?: string;
    limit?: number;
    status?: string;
  }): Promise<{ logs: TelemetryData[]; total: number }> {
    if (this.config.enableBackend && this.isBackendHealthy) {
      try {
        console.log('🔄 Fetching telemetry from backend...');
        const telemetry = await getTelemetry(params);
        
        // Transform backend data to match frontend expectations
        const transformedLogs = telemetry.logs.map((log: any) => ({
          _id: log._id,
          droneId: log.droneId,
          timestamp: new Date(log.timestamp),
          battery: log.battery,
          temperature: log.temperature,
          humidity: log.humidity,
          speed: log.speed,
          altitude: log.altitude,
          lat: log.lat,
          lng: log.lng,
          status: log.status,
        }));
        
        console.log(`✅ Retrieved ${transformedLogs.length} telemetry records from backend`);
        return {
          logs: transformedLogs,
          total: telemetry.total || transformedLogs.length,
        };
      } catch (error) {
        console.warn('⚠️ Backend telemetry fetch failed, using fallback:', error);
      }
    }

    // Fallback: Use auto-simulator data
    if (this.config.fallbackToSimulator) {
      console.log('🔄 Using auto-simulator fallback for telemetry...');
      try {
        // Generate current telemetry data from simulator
        const status = this.autoSimulator.getStatus();
        const fallbackLogs: TelemetryData[] = status.profiles.map((profile: any) => ({
          _id: `sim_${profile.id}_${Date.now()}`,
          droneId: profile.id,
          timestamp: new Date(),
          battery: profile.currentBattery,
          temperature: 25 + Math.random() * 10,
          humidity: 60 + Math.random() * 20,
          speed: profile.missionPhase === 'flying' ? 50 + Math.random() * 30 : 0,
          altitude: profile.missionPhase === 'flying' ? 150 + Math.random() * 50 : 0,
          lat: profile.currentLocation.lat,
          lng: profile.currentLocation.lng,
          status: this.mapSimulatorStatus(profile.missionPhase),
        }));
        
        console.log(`✅ Retrieved ${fallbackLogs.length} telemetry records from simulator`);
        return {
          logs: fallbackLogs,
          total: fallbackLogs.length,
        };
      } catch (error) {
        console.error('❌ Simulator fallback failed:', error);
      }
    }

    // Final fallback: Return empty data
    console.warn('⚠️ All data sources failed, returning empty telemetry');
    return { logs: [], total: 0 };
  }

  // Get drone history with backend fallback
  public async getDroneHistory(droneId: string, timeRange: string): Promise<TelemetryData[]> {
    if (this.config.enableBackend && this.isBackendHealthy) {
      try {
        console.log(`🔄 Fetching history for drone ${droneId} from backend...`);
        const history = await getDroneHistory(droneId, timeRange);
        
        // Transform backend data
        const transformedHistory = history.map((log: any) => ({
          _id: log._id,
          droneId: log.droneId,
          timestamp: new Date(log.timestamp),
          battery: log.battery,
          temperature: log.temperature,
          humidity: log.humidity,
          speed: log.speed,
          altitude: log.altitude,
          lat: log.location?.latitude || 0,
          lng: log.location?.longitude || 0,
          status: log.status,
        }));
        
        console.log(`✅ Retrieved ${transformedHistory.length} history records from backend`);
        return transformedHistory;
      } catch (error) {
        console.warn(`⚠️ Backend history fetch failed for drone ${droneId}, using fallback:`, error);
      }
    }

    // Fallback: Generate mock historical data
    if (this.config.fallbackToSimulator) {
      console.log(`🔄 Generating mock history for drone ${droneId}...`);
      try {
        const mockHistory = this.generateMockHistory(droneId, timeRange);
        console.log(`✅ Generated ${mockHistory.length} mock history records`);
        return mockHistory;
      } catch (error) {
        console.error('❌ Mock history generation failed:', error);
      }
    }

    return [];
  }

  // Helper method to map simulator phases to telemetry status
  private mapSimulatorStatus(phase: string): TelemetryData['status'] {
    switch (phase) {
      case 'idle': return 'Standby';
      case 'preparing': return 'Pre-Flight';
      case 'flying': return 'In Flight';
      case 'delivering': return 'Delivered';
      case 'returning': return 'Returning';
      default: return 'Standby';
    }
  }

  // Generate mock historical data for fallback
  private generateMockHistory(droneId: string, timeRange: string): TelemetryData[] {
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '10min':
        startTime = new Date(now.getTime() - 10 * 60 * 1000);
        break;
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    const interval = Math.max(1, Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 5))); // 5-minute intervals
    const history: TelemetryData[] = [];

    for (let i = 0; i < interval; i++) {
      const timestamp = new Date(startTime.getTime() + i * 5 * 60 * 1000);
      const progress = i / interval;
      
      history.push({
        _id: `mock_${droneId}_${timestamp.getTime()}`,
        droneId,
        timestamp,
        battery: Math.max(20, 100 - progress * 60 + Math.random() * 10),
        temperature: 25 + progress * 10 + Math.random() * 5,
        humidity: 60 + Math.random() * 20,
        speed: progress > 0.1 && progress < 0.9 ? 40 + Math.random() * 40 : 0,
        altitude: progress > 0.1 && progress < 0.9 ? 150 + Math.random() * 50 : 0,
        lat: -1.2921 + (Math.random() - 0.5) * 0.1,
        lng: 36.8219 + (Math.random() - 0.5) * 0.1,
        status: progress < 0.1 ? 'Standby' : 
                progress < 0.2 ? 'Pre-Flight' :
                progress < 0.8 ? 'In Flight' :
                progress < 0.9 ? 'Delivered' : 'Returning',
      });
    }

    return history;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<TelemetryServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enableBackend !== undefined) {
      if (newConfig.enableBackend) {
        this.startHealthCheck();
      } else {
        this.stopHealthCheck();
      }
    }
  }

  // Get current configuration
  public getConfig(): TelemetryServiceConfig {
    return { ...this.config };
  }

  // Get service status
  public getStatus() {
    return {
      backendHealthy: this.isBackendHealthy,
      config: this.config,
      autoSimulator: this.autoSimulator.getStatus(),
    };
  }

  // Send command to drone
  public async sendCommand(droneId: string, command: string, parameters?: any): Promise<boolean> {
    if (this.config.enableBackend && this.isBackendHealthy) {
      try {
        console.log(`🔄 Sending command ${command} to drone ${droneId} via backend...`);
        
        // Import the API function dynamically to avoid circular dependencies
        const { sendCommand: apiSendCommand } = await import('./api');
        const result = await apiSendCommand(droneId, command, parameters);
        
        console.log(`✅ Command sent successfully:`, result);
        return true;
      } catch (error) {
        console.warn(`⚠️ Backend command failed for drone ${droneId}:`, error);
        return false;
      }
    }

    // Fallback: Update local simulator state
    if (this.config.fallbackToSimulator) {
      try {
        console.log(`🔄 Updating local simulator state for drone ${droneId}...`);
        
        // Update the simulator state based on the command
        if (command === 'status_update') {
          // This would update the simulator's internal state
          // For now, we'll just log it
          console.log(`📝 Simulator state update: ${droneId} -> ${parameters.status}`);
        }
        
        return true;
      } catch (error) {
        console.error(`❌ Simulator command failed:`, error);
        return false;
      }
    }

    return false;
  }
}

// Export singleton instance
export const telemetryService = new TelemetryService();

// Export class for testing/advanced usage
export { TelemetryService }; 