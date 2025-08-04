'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Database, Wifi } from 'lucide-react';

interface SimulationStatus {
  isRunning: boolean;
  droneCount: number;
  profiles: Array<{
    id: string;
    name: string;
    battery: number;
    phase: string;
  }>;
}

export function LiveStatus() {
  const [status, setStatus] = useState<SimulationStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/simulation-status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch simulation status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">
                {status.isRunning ? 'Live Simulation Active' : 'Simulation Offline'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span className="text-sm">{status.droneCount} Drones</span>
            </div>
            
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Auto-generating data every 15s</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span className="text-sm">No MQTT required</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}