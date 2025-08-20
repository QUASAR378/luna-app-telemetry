'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { useRealTimeTelemetry } from '@/hooks/useRealTimeTelemetry';
import { webSocketClient } from '@/services/websocketClient';

interface TelemetryContextType {
  // State
  drones: DroneInfo[];
  currentTelemetry: TelemetryData | null;
  historicalData: TelemetryData[];
  isConnected: boolean;
  dataSource: 'websocket' | 'polling' | 'fallback';
  lastUpdate: Date | null;
  error: string | null;
  
  // Actions
  selectDrone: (droneId: string) => void;
  refreshData: () => Promise<void>;
  sendCommand: (droneId: string, command: string, parameters?: any) => Promise<boolean>;
  
  // WebSocket specific
  webSocketService: typeof webSocketClient | null;
  isWebSocketEnabled: boolean;
  
  // Utility methods
  getDroneById: (droneId: string) => DroneInfo | undefined;
  getDroneTelemetry: (droneId: string) => TelemetryData[];
  isDroneOnline: (droneId: string) => boolean;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

interface TelemetryProviderProps {
  children: ReactNode;
  options?: {
    enableWebSocket?: boolean;
    enablePolling?: boolean;
    pollingInterval?: number;
    autoReconnect?: boolean;
  };
}

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
    webSocketService: webSocketServiceInstance,
    isWebSocketEnabled,
  } = useRealTimeTelemetry(options);

  // Utility methods
  const getDroneById = useCallback((droneId: string): DroneInfo | undefined => {
    return drones.find(drone => drone.id === droneId);
  }, [drones]);

  const getDroneTelemetry = useCallback((droneId: string): TelemetryData[] => {
    return historicalData.filter(telemetry => telemetry.droneId === droneId);
  }, [historicalData]);

  const isDroneOnline = useCallback((droneId: string): boolean => {
    const drone = getDroneById(droneId);
    return drone?.isOnline ?? false;
  }, [getDroneById]);

  const contextValue: TelemetryContextType = {
    // State
    drones,
    currentTelemetry,
    historicalData,
    isConnected,
    dataSource,
    lastUpdate,
    error,
    
    // Actions
    selectDrone,
    refreshData,
    sendCommand,
    
    // WebSocket specific
    webSocketService: webSocketServiceInstance,
    isWebSocketEnabled,
    
    // Utility methods
    getDroneById,
    getDroneTelemetry,
    isDroneOnline,
  };

  return (
    <TelemetryContext.Provider value={contextValue}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}

// Hook for accessing specific telemetry data
export function useDroneTelemetry(droneId: string) {
  const { getDroneById, getDroneTelemetry, isDroneOnline } = useTelemetry();
  
  return {
    drone: getDroneById(droneId),
    telemetry: getDroneTelemetry(droneId),
    isOnline: isDroneOnline(droneId),
  };
}

// Hook for WebSocket-specific functionality
export function useWebSocket() {
  const { webSocketService, isWebSocketEnabled, isConnected } = useTelemetry();
  
  return {
    webSocketService,
    isWebSocketEnabled,
    isConnected,
    // WebSocket utility methods
    sendCommand: webSocketService?.sendCommand.bind(webSocketService),
    subscribeToDrones: webSocketService?.subscribeToDrones.bind(webSocketService),
    subscribeToTelemetry: webSocketService?.subscribeToTelemetry.bind(webSocketService),
  };
}