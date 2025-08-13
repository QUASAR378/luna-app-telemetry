'use client';

import React from 'react';
import { RealTimeTelemetry } from '@/components/telemetry/RealTimeTelemetry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useMqtt } from '@/contexts/TelemetryContext';
import { 
  Satellite, 
  Wifi, 
  Activity, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

export default function RealTimePage() {
  const { 
    drones, 
    currentTelemetry, 
    isConnected, 
    dataSource, 
    lastUpdate,
    error 
  } = useTelemetry();
  
  const { isMqttEnabled, isConnected: mqttConnected } = useMqtt();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Telemetry</h1>
          <p className="text-muted-foreground">
            Live drone monitoring via MQTT and real-time data streams
          </p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium">Backend Connection</div>
                  <div className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${mqttConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium">MQTT Connection</div>
                  <div className="text-sm text-muted-foreground">
                    {mqttConnected ? 'Live Stream' : 'Offline'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div>
                  <div className="font-medium">Data Source</div>
                  <div className="text-sm text-muted-foreground">
                    {dataSource === 'mqtt' ? 'MQTT Stream' : 
                     dataSource === 'polling' ? 'API Polling' : 'Simulator'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Indicator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Data Source Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {dataSource === 'mqtt' && (
                  <Badge variant="default" className="bg-green-600">
                    <Satellite className="h-4 w-4 mr-2" />
                    Live MQTT Data Stream
                  </Badge>
                )}
                {dataSource === 'polling' && (
                  <Badge variant="secondary">
                    <Database className="h-4 w-4 mr-2" />
                    API Polling
                  </Badge>
                )}
                {dataSource === 'fallback' && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Simulator Fallback
                  </Badge>
                )}
                
                {lastUpdate && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isMqttEnabled && (
                  <Badge variant="outline" className={mqttConnected ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                    <Wifi className="h-4 w-4 mr-2" />
                    MQTT {mqttConnected ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Telemetry Display */}
      <RealTimeTelemetry 
        showStatus={false} 
        showControls={true} 
      />

      {/* MQTT Information */}
      {isMqttEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Satellite className="h-5 w-5 text-primary" />
              <span>MQTT Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Connection Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={mqttConnected ? 'text-green-600' : 'text-red-600'}>
                      {mqttConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Broker:</span>
                    <span className="font-mono text-xs">ws://localhost:9001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Topics:</span>
                    <span className="font-mono text-xs">drones/+/data, drones/+/status</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Real-time Features</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Live telemetry streaming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Instant status updates</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Real-time commands</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Automatic reconnection</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Connection Error</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 