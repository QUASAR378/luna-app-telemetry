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
import { Activity, Wifi, Database } from 'lucide-react';


export default function DashboardPage() {
  const [drones, setDrones] = useState<DroneInfo[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<string>('');
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryData | null>(null);
  const [historicalData, setHistoricalData] = useState<TelemetryData[]>([]);
  const [timeRange, setTimeRange] = useState<'10m' | '1h' | '6h' | '24h' | '7d'>('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [hasMounted, setHasMounted] = useState(false);

useEffect(() => {
  setHasMounted(true);
}, []);


  // Fetch available drones
  useEffect(() => {
    const fetchDrones = async () => {
      try {
        // Small delay for data to be available
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch('/api/drones');
        if (!response.ok) throw new Error('Failed to fetch drone fleet data');
        const data = await response.json();
        setDrones(data);
        if (data.length > 0 && !selectedDrone) {
          setSelectedDrone(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to drone fleet');
      }
    };

    fetchDrones();
    
    // Refresh drone list every 10 seconds to catch status changes
    const interval = setInterval(fetchDrones, 10000);
    return () => clearInterval(interval);
  }, [selectedDrone]);

  // Fetch telemetry data for selected drone
  useEffect(() => {
    if (!selectedDrone) return;

    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        const timeRangeMs = getTimeRangeInMs(timeRange);
        const since = new Date(Date.now() - timeRangeMs).toISOString();
        
        const response = await fetch(
          `/api/telemetry?droneId=${selectedDrone}&since=${since}&limit=100`
        );
        
        if (!response.ok) throw new Error('Failed to fetch telemetry data');
        const data = await response.json();
        
        if (data.logs && data.logs.length > 0) {
          setCurrentTelemetry(data.logs[0]); // Most recent
          setHistoricalData(data.logs);
          setError(null);
          setLastUpdate(new Date());
        } else {
          setCurrentTelemetry(null);
          setHistoricalData([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to receive telemetry data');
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
    
    // Set up polling for real-time updates every 15 seconds
    const interval = setInterval(fetchTelemetry, 15000);
    
    return () => clearInterval(interval);
  }, [selectedDrone, timeRange]);

  const timeRangeOptions = [
    { value: '10m' as const, label: 'Last 10 minutes' },
    { value: '1h' as const, label: 'Last hour' },
    { value: '6h' as const, label: 'Last 6 hours' },
    { value: '24h' as const, label: 'Last 24 hours' },
    { value: '7d' as const, label: 'Last 7 days' },
  ];

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
              Real-time drone fleet monitoring and control
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              {hasMounted && (
  <span className="text-xs text-muted-foreground">
    Last update: {lastUpdate.toLocaleTimeString()}
  </span>
)}

            </div>
          </div>
        </div>
        
        {/* Time Range Filter */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4 text-green-400" />
            <span>Data Link Active</span>
          </div>
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
        onDroneSelect={setSelectedDrone}
      />

      {loading ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse text-primary" />
              <p className="text-muted-foreground">Loading telemetry data stream...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Telemetry Display */}
          <TelemetryGrid telemetry={currentTelemetry} />

          {/* Map and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasMounted && <DroneMap telemetry={currentTelemetry} />}
            <div className="lg:col-span-1">
              <HistoricalChart data={historicalData} timeRange={timeRange} />
            </div>
          </div>
        </>
      )}

      {/* Admin Control Panel */}
      <QuickControl />
    </div>
  );
}