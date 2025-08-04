'use client';

import React from 'react';
import { DroneInfo } from '@/types/telemetry';
import { Card, CardContent } from '@/components/ui/card';
import { getStatusColor } from '@/lib/utils';
import { Battery, MapPin, Clock } from 'lucide-react';

interface DroneSelectorProps {
  drones: DroneInfo[];
  selectedDrone: string;
  onDroneSelect: (droneId: string) => void;
}

export function DroneSelector({ drones, selectedDrone, onDroneSelect }: DroneSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Active Fleet</h2>
        <div className="text-sm text-muted-foreground">
          {drones.length} drones operational
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {drones.map((drone) => (
          <Card
            key={drone.id}
            className={`cursor-pointer transition-all hover:scale-[1.02] bg-card/50 border-border/50 backdrop-blur-sm ${
              selectedDrone === drone.id 
                ? 'ring-2 ring-primary shadow-lg bg-card/70' 
                : 'hover:bg-card/70'
            }`}
            onClick={() => onDroneSelect(drone.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base">{drone.name}</h3>
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {drone.id}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    drone.isOnline ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {drone.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className={`text-sm font-medium ${getStatusColor(drone.status)}`}>
                  {drone.status}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(drone.lastSeen).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>Active</span>
                  </div>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedDrone === drone.id && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-primary font-medium">
                    ● SELECTED FOR MONITORING
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}