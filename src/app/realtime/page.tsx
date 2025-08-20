'use client';

import React from 'react';
import { RealTimeTelemetry } from '@/components/telemetry/RealTimeTelemetry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useWebSocket } from '@/contexts/TelemetryContext';
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
  
  const { isWebSocketEnabled, isConnected: webSocketConnected, webSocketService } = useWebSocket();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Telemetry</h1>
          <p className="text-muted-foreground">
            Live drone monitoring via WebSocket real-time communication (Backend: ws://localhost:3000/ws)
          </p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium">Backend API</div>
                  <div className="text-sm text-muted-foreground">
                    {isConnected ? 'API Connected (Port 3000)' : 'API Disconnected'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${webSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium">WebSocket Stream</div>
                  <div className="text-sm text-muted-foreground">
                    {webSocketConnected ? 'Connected & Streaming' : 'Disconnected'}
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
                  <div className="font-medium">Active Data Source</div>
                  <div className="text-sm text-muted-foreground">
                    {dataSource === 'websocket' ? 'WebSocket (Real-time)' : 
                     dataSource === 'polling' ? 'HTTP Polling (Fallback)' : 'Local Simulator'}
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
                {dataSource === 'websocket' && (
                  <Badge variant="default" className="bg-green-600">
                    <Satellite className="h-4 w-4 mr-2" />
                    WebSocket Real-time Stream Active
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
                {isWebSocketEnabled && (
                  <Badge variant="outline" className={webSocketConnected ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                    <Wifi className="h-4 w-4 mr-2" />
                    WebSocket {webSocketConnected ? 'Connected' : 'Disconnected'}
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

      {/* WebSocket Information */}
      {isWebSocketEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Satellite className="h-5 w-5 text-primary" />
              <span>WebSocket Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">WebSocket Connection</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={webSocketConnected ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {webSocketConnected ? '🟢 Connected & Active' : '🔴 Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <span className="font-mono text-xs">ws://localhost:3000/ws</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protocol:</span>
                    <span className="font-mono text-xs">WebSocket (replaces MQTT)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Backend API:</span>
                    <span className="font-mono text-xs">http://localhost:3000/api</span>
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