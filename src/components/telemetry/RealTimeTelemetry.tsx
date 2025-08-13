import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Database, 
  Satellite, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface RealTimeTelemetryProps {
  droneId?: string;
  showStatus?: boolean;
  showControls?: boolean;
}

export function RealTimeTelemetry({ 
  droneId, 
  showStatus = true, 
  showControls = true 
}: RealTimeTelemetryProps) {
  const {
    drones,
    currentTelemetry,
    isConnected,
    dataSource,
    lastUpdate,
    error,
    selectDrone,
    refreshData,
    sendCommand,
  } = useTelemetry();

  const [selectedDroneId, setSelectedDroneId] = useState(droneId || '');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-select drone if none selected
  useEffect(() => {
    if (!selectedDroneId && drones.length > 0) {
      const firstDrone = drones[0];
      setSelectedDroneId(firstDrone.id);
      selectDrone(firstDrone.id);
    }
  }, [drones, selectedDroneId, selectDrone]);

  // Handle drone selection
  const handleDroneSelect = (newDroneId: string) => {
    setSelectedDroneId(newDroneId);
    selectDrone(newDroneId);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get data source indicator
  const getDataSourceIndicator = () => {
    switch (dataSource) {
      case 'mqtt':
        return (
          <Badge variant="default" className="bg-green-600">
            <Satellite className="h-3 w-3 mr-1" />
            Live MQTT
          </Badge>
        );
      case 'polling':
        return (
          <Badge variant="secondary">
            <Database className="h-3 w-3 mr-1" />
            API Polling
          </Badge>
        );
      case 'fallback':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Simulator
          </Badge>
        );
      default:
        return null;
    }
  };

  // Get connection status indicator
  const getConnectionIndicator = () => {
    if (isConnected) {
      return (
        <Badge variant="default" className="bg-green-600">
          <Wifi className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <WifiOff className="h-3 w-3 mr-1" />
          Disconnected
        </Badge>
      );
    }
  };

  // Get selected drone
  const selectedDrone = drones.find(drone => drone.id === selectedDroneId);

  if (error && drones.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      {showStatus && (
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getConnectionIndicator()}
                {getDataSourceIndicator()}
                {lastUpdate && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drone Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Drone Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {drones.map((drone) => (
              <Button
                key={drone.id}
                onClick={() => handleDroneSelect(drone.id)}
                variant={selectedDroneId === drone.id ? "default" : "outline"}
                className="flex flex-col items-center p-4 h-auto"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold">{drone.name}</span>
                  {drone.isOnline ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {drone.status}
                </div>
                {drone.battery && (
                  <div className="text-xs mt-1">
                    Battery: {drone.battery}%
                  </div>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Telemetry */}
      {currentTelemetry && selectedDrone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Live Telemetry - {selectedDrone.name}</span>
              <div className="flex items-center space-x-2">
                <Activity className={`h-4 w-4 ${isConnected ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                <span className="text-sm text-muted-foreground">
                  {dataSource === 'mqtt' ? 'Real-time' : 'Polled'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentTelemetry.battery}%
                </div>
                <div className="text-sm text-muted-foreground">Battery</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {currentTelemetry.temperature}°C
                </div>
                <div className="text-sm text-muted-foreground">Temperature</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600">
                  {currentTelemetry.speed} km/h
                </div>
                <div className="text-sm text-muted-foreground">Speed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentTelemetry.altitude}m
                </div>
                <div className="text-sm text-muted-foreground">Altitude</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">{currentTelemetry.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Humidity:</span>
                  <span className="ml-2 font-medium">{currentTelemetry.humidity}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <span className="ml-2 font-mono text-xs">
                    {currentTelemetry.lat.toFixed(6)}, {currentTelemetry.lng.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="ml-2 font-medium">
                    {new Date(currentTelemetry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Controls */}
      {showControls && selectedDrone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => sendCommand(selectedDrone.id, 'takeoff')}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                Take Off
              </Button>
              
              <Button
                onClick={() => sendCommand(selectedDrone.id, 'land')}
                variant="default"
                className="bg-red-600 hover:bg-red-700"
              >
                Land
              </Button>
              
              <Button
                onClick={() => sendCommand(selectedDrone.id, 'return_home')}
                variant="outline"
              >
                Return Home
              </Button>
              
              <Button
                onClick={() => sendCommand(selectedDrone.id, 'emergency_stop')}
                variant="destructive"
              >
                Emergency Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 