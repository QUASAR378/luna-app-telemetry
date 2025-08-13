import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMqtt } from '@/contexts/TelemetryContext';
import { 
  Satellite, 
  Wifi, 
  WifiOff, 
  Activity, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Signal,
  Database,
  Settings
} from 'lucide-react';

interface MqttMetrics {
  messagesReceived: number;
  messagesSent: number;
  connectionUptime: number;
  lastMessageTime: Date | null;
  reconnectAttempts: number;
}

export function MqttStatusPanel() {
  const { mqttService, isMqttEnabled, isConnected } = useMqtt();
  const [metrics, setMetrics] = useState<MqttMetrics>({
    messagesReceived: 0,
    messagesSent: 0,
    connectionUptime: 0,
    lastMessageTime: null,
    reconnectAttempts: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update metrics periodically
  useEffect(() => {
    if (!isMqttEnabled) return;

    const interval = setInterval(() => {
      if (mqttService) {
        // In a real implementation, you'd get these from the MQTT service
        setMetrics(prev => ({
          ...prev,
          connectionUptime: prev.connectionUptime + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMqttEnabled, mqttService]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (mqttService && !isConnected) {
        await mqttService.connect();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    if (mqttService) {
      mqttService.disconnect();
    }
  };

  // Handle reconnect
  const handleReconnect = async () => {
    if (mqttService) {
      await mqttService.connect();
    }
  };

  if (!isMqttEnabled) {
    return (
      <Card className="bg-secondary/30 border-dashed">
        <CardContent className="p-6 text-center">
          <Satellite className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">MQTT Disabled</h3>
          <p className="text-sm text-muted-foreground">
            MQTT real-time communication is not enabled in the current configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Satellite className="h-5 w-5 text-primary" />
              <span>MQTT Connection Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowAdvanced(!showAdvanced)}
                variant="ghost"
                size="sm"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Connection Status */}
            <div className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-muted-foreground">
                {isConnected ? 'Live Stream' : 'Offline'}
              </div>
            </div>

            {/* Uptime */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.floor(metrics.connectionUptime / 60)}m {metrics.connectionUptime % 60}s
              </div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>

            {/* Messages */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.messagesReceived}
              </div>
              <div className="text-sm text-muted-foreground">Messages</div>
            </div>
          </div>

          {/* Connection Actions */}
          <div className="flex items-center justify-center space-x-3 mt-4">
            {isConnected ? (
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleReconnect}
                variant="default"
                size="sm"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Connection Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Broker URL:</span>
                    <span className="font-mono text-xs">ws://localhost:9001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client ID:</span>
                    <span className="font-mono text-xs">luna-frontend-*</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Keep Alive:</span>
                    <span>60s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">QoS Level:</span>
                    <span>1</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Subscribed Topics</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs">drones/+/data</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs">drones/+/status</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs">drones/+/commands</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Real-time Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {metrics.messagesReceived}
              </div>
              <div className="text-xs text-muted-foreground">Received</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {metrics.messagesSent}
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {metrics.reconnectAttempts}
              </div>
              <div className="text-xs text-muted-foreground">Reconnects</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {metrics.lastMessageTime ? 
                  Math.floor((Date.now() - metrics.lastMessageTime.getTime()) / 1000) : 
                  'N/A'
                }s
              </div>
              <div className="text-xs text-muted-foreground">Last Message</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span>Connection Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Connection Status</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? 'Healthy' : 'Unhealthy'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-reconnect</span>
              <Badge variant="outline">Enabled</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Message Queue</span>
              <Badge variant="outline">Empty</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Error Rate</span>
              <Badge variant="outline">0%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 