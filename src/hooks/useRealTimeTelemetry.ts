import { useState, useEffect, useCallback, useRef } from 'react';
import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { webSocketClient, WebSocketCallbacks } from '@/services/websocketClient';
import { telemetryService } from '@/services/telemetryService';

interface UseRealTimeTelemetryOptions {
  enableWebSocket?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
  autoReconnect?: boolean;
}

interface RealTimeTelemetryState {
  drones: DroneInfo[];
  currentTelemetry: TelemetryData | null;
  historicalData: TelemetryData[];
  isConnected: boolean;
  dataSource: 'websocket' | 'polling' | 'fallback';
  lastUpdate: Date | null;
  error: string | null;
}

export function useRealTimeTelemetry(options: UseRealTimeTelemetryOptions = {}) {
  const {
    enableWebSocket = true,
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

  // WebSocket message handlers
  const handleDronesUpdate = useCallback((drones: DroneInfo[]) => {
    console.log('📡 Received WebSocket drones update:', drones.length, 'drones');
    setState(prev => ({
      ...prev,
      drones,
      lastUpdate: new Date(),
      dataSource: 'websocket',
      isConnected: true,
    }));
  }, []);

  const handleTelemetryUpdate = useCallback((telemetryData: { logs: TelemetryData[]; total: number; droneId: string }) => {
    console.log('📡 Received WebSocket telemetry update:', telemetryData.logs.length, 'records');
    setState(prev => ({
      ...prev,
      currentTelemetry: telemetryData.logs[0] || null,
      historicalData: telemetryData.logs,
      lastUpdate: new Date(),
      dataSource: 'websocket',
      isConnected: true,
    }));
  }, []);

  const handleTelemetryRealtime = useCallback((telemetryData: TelemetryData) => {
    console.log('📡 Received WebSocket real-time telemetry:', telemetryData.droneId);
    setState(prev => ({
      ...prev,
      currentTelemetry: telemetryData,
      historicalData: [telemetryData, ...prev.historicalData.slice(0, 99)], // Keep last 100 records
      lastUpdate: new Date(),
      dataSource: 'websocket',
      isConnected: true,
    }));
  }, []);

  const handleDroneStatusUpdate = useCallback((drone: DroneInfo) => {
    console.log('📡 Received WebSocket drone status update:', drone.id);
    
    // Update drone in the list
    setState(prev => ({
      ...prev,
      drones: prev.drones.map(existingDrone => 
        existingDrone.id === drone.id ? drone : existingDrone
      ),
      lastUpdate: new Date(),
      dataSource: 'websocket',
      isConnected: true,
    }));
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('🔌 WebSocket connection changed:', connected);
    setState(prev => ({ 
      ...prev, 
      isConnected: connected,
      dataSource: connected ? 'websocket' : (telemetryService.isBackendAvailable() ? 'polling' : 'fallback')
    }));
  }, []);

  const handleWebSocketError = useCallback((error: Error) => {
    console.error('❌ WebSocket error:', error);
    setState(prev => ({ 
      ...prev, 
      error: `WebSocket Error: ${error.message}`,
      dataSource: telemetryService.isBackendAvailable() ? 'polling' : 'fallback'
    }));
  }, []);

  // Initialize WebSocket if enabled
  useEffect(() => {
    if (enableWebSocket && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Set up WebSocket callbacks
      const callbacks: WebSocketCallbacks = {
        onDronesUpdate: handleDronesUpdate,
        onTelemetryUpdate: handleTelemetryUpdate,
        onTelemetryRealtime: handleTelemetryRealtime,
        onDroneStatusUpdate: handleDroneStatusUpdate,
        onConnectionChange: handleConnectionChange,
        onError: handleWebSocketError,
      };
      
      webSocketClient.setCallbacks(callbacks);

      // Connect to WebSocket server
      webSocketClient.connect().then((connected) => {
        if (connected) {
          console.log('✅ WebSocket connected successfully');
          // Subscribe to initial data
          webSocketClient.subscribeToDrones();
          setState(prev => ({ 
            ...prev, 
            isConnected: true,
            dataSource: 'websocket'
          }));
        } else {
          console.warn('⚠️ WebSocket connection failed, falling back to polling');
          setState(prev => ({ 
            ...prev, 
            dataSource: telemetryService.isBackendAvailable() ? 'polling' : 'fallback'
          }));
        }
      });
    }

    return () => {
      if (enableWebSocket) {
        webSocketClient.removeCallback('onDronesUpdate');
        webSocketClient.removeCallback('onTelemetryUpdate');
        webSocketClient.removeCallback('onTelemetryRealtime');
        webSocketClient.removeCallback('onDroneStatusUpdate');
        webSocketClient.removeCallback('onConnectionChange');
        webSocketClient.removeCallback('onError');
      }
    };
  }, [enableWebSocket, handleDronesUpdate, handleTelemetryUpdate, handleTelemetryRealtime, handleDroneStatusUpdate, handleConnectionChange, handleWebSocketError]);

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
      if (enableWebSocket) {
        webSocketClient.destroy();
      }
    };
  }, [enableWebSocket, stopPolling]);

  // Public methods
  const selectDrone = useCallback((droneId: string) => {
    selectedDroneRef.current = droneId;
    if (state.dataSource === 'websocket') {
      // Subscribe to telemetry for the selected drone
      webSocketClient.subscribeToTelemetry(droneId);
    } else if (state.dataSource === 'polling') {
      fetchTelemetryData(droneId);
    }
  }, [state.dataSource, fetchTelemetryData]);

  const refreshData = useCallback(async () => {
    await initializeData();
    if (selectedDroneRef.current) {
      await fetchTelemetryData(selectedDroneRef.current);
    }
  }, [initializeData, fetchTelemetryData]);

  const sendCommand = useCallback(async (droneId: string, command: string, parameters?: any) => {
    try {
      if (state.isConnected && enableWebSocket) {
        // Send via WebSocket if connected
        const success = webSocketClient.sendCommand(droneId, command, parameters);
        if (success) {
          console.log(`✅ Command sent via WebSocket: ${command} to ${droneId}`);
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
  }, [state.isConnected, enableWebSocket]);

  return {
    ...state,
    selectDrone,
    refreshData,
    sendCommand,
    // WebSocket specific methods
    webSocketService: enableWebSocket ? webSocketClient : null,
    isWebSocketEnabled: enableWebSocket,
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