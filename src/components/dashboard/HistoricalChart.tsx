'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TelemetryData } from '@/types/telemetry';

interface HistoricalChartProps {
  data: TelemetryData[];
  timeRange: string;
}

export function HistoricalChart({ data, timeRange }: HistoricalChartProps) {
  const chartData = data.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    battery: point.battery,
    temperature: point.temperature,
    humidity: point.humidity,
    speed: point.speed,
    altitude: point.altitude / 10, // Scale altitude for better visualization
  }));

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Historical Data - Last {timeRange}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="battery"
                stroke="#22c55e"
                strokeWidth={2}
                name="Battery (%)"
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                name="Temperature (°C)"
              />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Humidity (%)"
              />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#eab308"
                strokeWidth={2}
                name="Speed (km/h)"
              />
              <Line
                type="monotone"
                dataKey="altitude"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Altitude (10m)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}