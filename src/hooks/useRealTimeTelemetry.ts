import { useState, useEffect, useCallback, useRef } from 'react';
import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { mqttService, MqttDroneData, MqttDroneStatus } from '@/services/mqttClient';
import { telemetryService } from '@/services/telemetryService';

interface UseRealTimeTelemetryOptions {
  enableMQTT?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
  autoReconnect?: boolean;
}

interface RealTimeTelemetryState {
  drones: DroneInfo[];
  currentTelemetry: TelemetryData | null;
  historicalData: TelemetryData[];
  isConnected: boolean;
  dataSource: 'mqtt' | 'polling' | 'fallback';
  lastUpdate: Date | null;
  error: string | null;
}

export function useRealTimeTelemetry(options: UseRealTimeTelemetryOptions = {}) {
  const {
    enableMQTT = true,
    enablePolling = true,
    pollingInterval = 15000,
    autoReconnect = true,
  } = options;

  const [state, setState] = useState<RealTimeTelemetryState>({
    drones: [],
    currentTelemetry: null,
    historicalData: [],
    isConnected: false,
    dataSource: 'fallback',
    lastUpdate: null,
    error: null,
  });

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedDroneRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  const autoSimulatorRef = useRef<any>(null);

  // Initialize auto-simulator for fallback data
  const initializeAutoSimulator = useCallback(async () => {
    try {
      if (!autoSimulatorRef.current) {
        const { getAutoSimulator } = await import('@/lib/auto-simulator');
        autoSimulatorRef.current = getAutoSimulator();
        await autoSimulatorRef.current.start();
        console.log('🚀 Auto-simulator initialized for fallback data');
      }
    } catch (error) {
      console.warn('Failed to initialize auto-simulator:', error);
    }
  }, []);

  // Initialize data fetching
  const initializeData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      // Get initial drone list
      const drones = await telemetryService.getDrones();
      if (drones.length > 0) {
        setState(prev => ({ 
          ...prev, 
          drones,
          dataSource: telemetryService.isBackendAvailable() ? 'polling' : 'fallback'
        }));
        
        // Select first drone if none selected
        if (!selectedDroneRef.current) {
          selectedDroneRef.current = drones[0].id;
        }
      } else {
        // If no drones from backend, initialize auto-simulator for fallback
        await initializeAutoSimulator();
        if (autoSimulatorRef.current) {
          const fallbackDrones = autoSimulatorRef.current.getDroneProfiles();
          setState(prev => ({ 
            ...prev, 
            drones: fallbackDrones,
            dataSource: 'fallback'
          }));
          
          if (!selectedDroneRef.current && fallbackDrones.length > 0) {
            selectedDroneRef.current = fallbackDrones[0].id;
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize data:', error);
      
      // If backend fails, try auto-simulator as fallback
      try {
        await initializeAutoSimulator();
        if (autoSimulatorRef.current) {
          const fallbackDrones = autoSimulatorRef.current.getDroneProfiles();
          setState(prev => ({ 
            ...prev, 
            drones: fallbackDrones,
            dataSource: 'fallback',
            error: null
          }));
          
          if (!selectedDroneRef.current && fallbackDrones.length > 0) {
            selectedDroneRef.current = fallbackDrones[0].id;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to initialize data' 
        }));
      }
    }
  }, [initializeAutoSimulator]);

  // Fetch telemetry data for selected drone
  const fetchTelemetryData = useCallback(async (droneId: string, timeRange: string = '1h') => {
    try {
      const telemetryData = await telemetryService.getTelemetryData({
        droneId,
        since: new Date(Date.now() - getTimeRangeInMs(timeRange)).toISOString(),
        limit: 100,
      });

      if (telemetryData.logs.length > 0) {
        setState(prev => ({
          ...prev,
          currentTelemetry: telemetryData.logs[0],
          historicalData: telemetryData.logs,
          lastUpdate: new Date(),
          dataSource: telemetryService.isBackendAvailable() ? 'polling' : 'fallback',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error);
      
      // Try fallback data from auto-simulator
      try {
        if (autoSimulatorRef.current) {
          const fallbackTelemetry = autoSimulatorRef.current.getCurrentTelemetry();
          const droneTelemetry = fallbackTelemetry.filter((t: TelemetryData) => t.droneId === droneId);
          
          if (droneTelemetry.length > 0) {
            setState(prev => ({
              ...prev,
              currentTelemetry: droneTelemetry[0],
              historicalData: droneTelemetry,
              lastUpdate: new Date(),
              dataSource: 'fallback',
              error: null,
            }));
            return;
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback telemetry also failed:', fallbackError);
      }
      
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch telemetry data' 
      }));
    }
  }, []);

  // Start polling for data updates
  const startPolling = useCallback(() => {
    if (!enablePolling || pollingTimerRef.current) return;

    const poll = async () => {
      if (selectedDroneRef.current) {
        await fetchTelemetryData(selectedDroneRef.current);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingTimerRef.current = setInterval(poll, pollingInterval);
  }, [enablePolling, pollingInterval, fetchTelemetryData]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // MQTT message handlers
  const handleDroneData = useCallback((mqttData: MqttDroneData) => {
    console.log('📡 Received MQTT drone data:', mqttData);
    
    // Transform MQTT data to TelemetryData format
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
      historicalData: [telemetryData, ...prev.historicalData.slice(0, 99)], // Keep last 100 records
      lastUpdate: new Date(),
      dataSource: 'mqtt',
      isConnected: true,
    }));
  }, []);

  const handleDroneStatus = useCallback((mqttStatus: MqttDroneStatus) => {
    console.log('📡 Received MQTT drone status:', mqttStatus);
    
    // Update drone in the list
    setState(prev => ({
      ...prev,
      drones: prev.drones.map(drone => 
        drone.id === mqttStatus.droneId 
          ? {
              ...drone,
              status: mqttStatus.status,
              isOnline: mqttStatus.isOnline,
              battery: mqttStatus.lastTelemetry?.battery,
              lastSeen: new Date(mqttStatus.lastSeen),
            }
          : drone
      ),
      lastUpdate: new Date(),
      dataSource: 'mqtt',
      isConnected: true,
    }));
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('🔌 MQTT connection changed:', connected);
    setState(prev => ({ 
      ...prev, 
      isConnected: connected,
      dataSource: connected ? 'mqtt' : (telemetryService.isBackendAvailable() ? 'polling' : 'fallback')
    }));
  }, []);

  const handleMqttError = useCallback((error: Error) => {
    console.error('❌ MQTT error:', error);
    setState(prev => ({ 
      ...prev, 
      error: `MQTT Error: ${error.message}`,
      dataSource: telemetryService.isBackendAvailable() ? 'polling' : 'fallback'
    }));
  }, []);

  // Initialize MQTT if enabled
  useEffect(() => {
    if (enableMQTT && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Set up MQTT callbacks
      mqttService.setCallbacks({
        onDroneData: handleDroneData,
        onDroneStatus: handleDroneStatus,
        onConnectionChange: handleConnectionChange,
        onError: handleMqttError,
      });

      // Connect to MQTT broker
      mqttService.connect().then((connected) => {
        if (connected) {
          console.log('✅ MQTT connected successfully');
          setState(prev => ({ 
            ...prev, 
            isConnected: true,
            dataSource: 'mqtt'
          }));
        } else {
          console.warn('⚠️ MQTT connection failed, falling back to polling');
          setState(prev => ({ 
            ...prev, 
            dataSource: telemetryService.isBackendAvailable() ? 'polling' : 'fallback'
          }));
        }
      });
    }

    return () => {
      if (enableMQTT) {
        mqttService.removeCallback('onDroneData');
        mqttService.removeCallback('onDroneStatus');
        mqttService.removeCallback('onConnectionChange');
        mqttService.removeCallback('onError');
      }
    };
  }, [enableMQTT, handleDroneData, handleDroneStatus, handleConnectionChange, handleMqttError]);

  // Initialize data and start polling
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Start/stop polling based on data source
  useEffect(() => {
    if (state.dataSource === 'polling') {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [state.dataSource, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (enableMQTT) {
        mqttService.destroy();
      }
    };
  }, [enableMQTT, stopPolling]);

  // Public methods
  const selectDrone = useCallback((droneId: string) => {
    selectedDroneRef.current = droneId;
    if (state.dataSource === 'polling') {
      fetchTelemetryData(droneId);
    }
  }, [fetchTelemetryData]);

  const refreshData = useCallback(async () => {
    await initializeData();
    if (selectedDroneRef.current) {
      await fetchTelemetryData(selectedDroneRef.current);
    }
  }, [initializeData, fetchTelemetryData]);

  const sendCommand = useCallback(async (droneId: string, command: string, parameters?: any) => {
    try {
      if (state.isConnected && enableMQTT) {
        // Send via MQTT if connected
        const success = mqttService.publishCommand(droneId, command, parameters);
        if (success) {
          console.log(`✅ Command sent via MQTT: ${command} to ${droneId}`);
          return true;
        }
      }

      // Fallback to telemetry service
      const success = await telemetryService.sendCommand(droneId, command, parameters);
      if (success) {
        console.log(`✅ Command sent via service: ${command} to ${droneId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }, [state.isConnected, enableMQTT]);

  return {
    ...state,
    selectDrone,
    refreshData,
    sendCommand,
    // MQTT specific methods
    mqttService: enableMQTT ? mqttService : null,
    isMqttEnabled: enableMQTT,
  };
}

// Helper function to get time range in milliseconds
function getTimeRangeInMs(timeRange: string): number {
  switch (timeRange) {
    case '10m': return 10 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000; // Default to 1 hour
  }
} 