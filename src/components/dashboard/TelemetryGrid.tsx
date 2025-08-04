'use client';

import React from 'react';
import { TelemetryData } from '@/types/telemetry';
import { MetricGauge } from './MetricGauge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStatusColor, getStatusIcon, formatTimestamp } from '@/lib/utils';
import { MapPin, Clock, Activity, Thermometer } from 'lucide-react';

interface TelemetryGridProps {
  telemetry: TelemetryData | null;
}

export function TelemetryGrid({ telemetry }: TelemetryGridProps) {
  if (!telemetry) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="col-span-full bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Connecting to drone telemetry...</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Establishing data link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status and Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              <span>Mission Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getStatusIcon(telemetry.status)}</span>
                <div>
                  <div className={`text-xl font-bold ${getStatusColor(telemetry.status)}`}>
                    {telemetry.status}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Drone {telemetry.droneId}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last update: {formatTimestamp(telemetry.timestamp)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Position & Navigation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Latitude</div>
                  <div className="font-mono text-sm">{telemetry.lat.toFixed(6)}°</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Longitude</div>
                  <div className="font-mono text-sm">{telemetry.lng.toFixed(6)}°</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm text-muted-foreground">Altitude</div>
                  <div className="font-semibold">{telemetry.altitude}m AGL</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ground Speed</div>
                  <div className="font-semibold">{telemetry.speed} km/h</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricGauge
          title="Battery Level"
          subtitle="Power Management"
          value={telemetry.battery}
          unit="%"
          max={100}
          type="battery"
        />
        <MetricGauge
          title="Core Temperature"
          subtitle="Thermal Management"
          value={telemetry.temperature}
          unit="°C"
          max={50}
          type="temperature"
        />
        <MetricGauge
          title="Humidity Sensor"
          subtitle="Environmental"
          value={telemetry.humidity}
          unit="%"
          max={100}
          type="humidity"
        />
        <MetricGauge
          title="Airspeed"
          subtitle="Flight Dynamics"
          value={telemetry.speed}
          unit="km/h"
          max={80}
          type="speed"
        />
      </div>
    </div>
  );
}