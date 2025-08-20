'use client';
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { TelemetryData, DroneInfo } from '@/types/telemetry';
import { DroneSelector } from '@/components/dashboard/DroneSelector';
import { TelemetryGrid } from '@/components/dashboard/TelemetryGrid';
// import { DroneMap } from '@/components/dashboard/DroneMap';
const DroneMap = dynamic(() => import('@/components/dashboard/DroneMap'), { ssr: false });


import { HistoricalChart } from '@/components/dashboard/HistoricalChart';
import { QuickControl } from '@/components/admin/QuickControl';
import { Card, CardContent } from '@/components/ui/card';
import { getTimeRangeInMs } from '@/lib/utils';
import { Activity, Wifi, Database, Server, AlertTriangle } from 'lucide-react';

// Import the new telemetry context
import { useTelemetry } from '@/contexts/TelemetryContext';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'10m' | '1h' | '6h' | '24h' | '7d'>('1h');
  const [hasMounted, setHasMounted] = useState(false);

  // Use the new telemetry context
  const {
    drones,
    currentTelemetry,
    historicalData,
    isConnected,
    dataSource,
    lastUpdate,
    error,
    selectDrone,
  } = useTelemetry();

  const [selectedDrone, setSelectedDrone] = useState<string>('');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Auto-select drone if none selected
  useEffect(() => {
    if (drones.length > 0 && !selectedDrone) {
      setSelectedDrone(drones[0].id);
      selectDrone(drones[0].id);
    }
  }, [drones, selectedDrone, selectDrone]);

  // Handle drone selection
  const handleDroneSelect = (droneId: string) => {
    setSelectedDrone(droneId);
    selectDrone(droneId);
  };

  const timeRangeOptions = [
    { value: '10m' as const, label: 'Last 10 minutes' },
    { value: '1h' as const, label: 'Last hour' },
    { value: '6h' as const, label: 'Last 6 hours' },
    { value: '24h' as const, label: 'Last 24 hours' },
    { value: '7d' as const, label: 'Last 7 days' },
  ];

  // Get status indicator components
  const getStatusIndicator = () => {
    if (isConnected) {
      return (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <Server className="h-4 w-4" />
          <span>WebSocket Connected</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span>WebSocket Disconnected - Using Fallback</span>
        </div>
      );
    }
  };

  const getDataSourceIndicator = () => {
    switch (dataSource) {
      case 'websocket':
        return (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Database className="h-4 w-4" />
            <span>Live WebSocket Data</span>
          </div>
        );
      case 'polling':
        return (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <Database className="h-4 w-4" />
            <span>API Polling</span>
          </div>
        );
      case 'fallback':
        return (
          <div className="flex items-center space-x-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Simulator Data</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (error && drones.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Wifi className="h-8 w-8 animate-pulse" />
              <p>Establishing connection to drone fleet...</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Initializing telemetry data streams and flight management systems.
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground/70">
              <span>• GPS Navigation</span>
              <span>• Power Systems</span>
              <span>• Environmental Sensors</span>
            </div>
          </CardContent>
        </Card>
        <QuickControl />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with System Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Operations Dashboard</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-muted-foreground">
              Real-time drone fleet monitoring via WebSocket communication
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              {hasMounted && lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Last WebSocket update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* System Status Indicators */}
        <div className="flex items-center space-x-4">
          {getStatusIndicator()}
          {getDataSourceIndicator()}
          
          {/* Time Range Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Time range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-secondary border border-border rounded-md px-3 py-1 text-sm"
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fleet Selector */}
      <DroneSelector
        drones={drones}
        selectedDrone={selectedDrone}
        onDroneSelect={handleDroneSelect}
      />

      {/* Main Telemetry Display */}
      <TelemetryGrid telemetry={currentTelemetry} />

      {/* Map and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasMounted && <DroneMap telemetry={currentTelemetry} />}
        <div className="lg:col-span-1">
          <HistoricalChart data={historicalData} timeRange={timeRange} />
        </div>
      </div>

      {/* Admin Control Panel */}
      <QuickControl />
    </div>
  );
}