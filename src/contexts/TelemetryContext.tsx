'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { useRealTimeTelemetry } from '@/hooks/useRealTimeTelemetry';
import { mqttService } from '@/services/mqttClient';

interface TelemetryContextType {
  // State
  drones: DroneInfo[];
  currentTelemetry: TelemetryData | null;
  historicalData: TelemetryData[];
  isConnected: boolean;
  dataSource: 'mqtt' | 'polling' | 'fallback';
  lastUpdate: Date | null;
  error: string | null;
  
  // Actions
  selectDrone: (droneId: string) => void;
  refreshData: () => Promise<void>;
  sendCommand: (droneId: string, command: string, parameters?: any) => Promise<boolean>;
  
  // MQTT specific
  mqttService: typeof mqttService | null;
  isMqttEnabled: boolean;
  
  // Utility methods
  getDroneById: (droneId: string) => DroneInfo | undefined;
  getDroneTelemetry: (droneId: string) => TelemetryData[];
  isDroneOnline: (droneId: string) => boolean;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

interface TelemetryProviderProps {
  children: ReactNode;
  options?: {
    enableMQTT?: boolean;
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
    mqttService: mqttServiceInstance,
    isMqttEnabled,
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
    
    // MQTT specific
    mqttService: mqttServiceInstance,
    isMqttEnabled,
    
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

// Hook for MQTT-specific functionality
export function useMqtt() {
  const { mqttService, isMqttEnabled, isConnected } = useTelemetry();
  
  return {
    mqttService,
    isMqttEnabled,
    isConnected,
    // MQTT utility methods
    publishCommand: mqttService?.publishCommand.bind(mqttService),
    subscribeToDroneData: mqttService?.subscribeToDroneData.bind(mqttService),
    subscribeToDroneStatus: mqttService?.subscribeToDroneStatus.bind(mqttService),
  };
} 