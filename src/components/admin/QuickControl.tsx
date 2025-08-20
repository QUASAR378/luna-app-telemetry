import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Power, 
  Play, 
  Square, 
  Plane, 
  Battery, 
  Settings,
  Eye,
  EyeOff,
  Zap,
  AlertTriangle,
  CheckCircle,
  Server,
  Wifi
} from 'lucide-react';

// Import the telemetry context
import { useTelemetry } from '@/contexts/TelemetryContext';

interface DroneControlState {
  droneId: string;
  status: string;
  isOnline: boolean;
  battery?: number;
}

const DRONE_STATUSES = [
  { value: 'Powered Off', label: 'Powered Off', color: 'text-gray-400', icon: Power },
  { value: 'Standby', label: 'Standby', color: 'text-yellow-400', icon: Square },
  { value: 'Pre-Flight', label: 'Pre-Flight', color: 'text-blue-400', icon: Settings },
  { value: 'Active', label: 'Active', color: 'text-green-400', icon: CheckCircle },
  { value: 'In Flight', label: 'In Flight', color: 'text-cyan-400', icon: Plane },
  { value: 'Landing', label: 'Landing', color: 'text-orange-400', icon: Plane },
  { value: 'Delivered', label: 'Delivered', color: 'text-green-500', icon: CheckCircle },
  { value: 'Returning', label: 'Returning', color: 'text-purple-400', icon: Plane },
  { value: 'Maintenance', label: 'Maintenance', color: 'text-orange-500', icon: Settings },
  { value: 'Emergency', label: 'Emergency', color: 'text-red-500', icon: AlertTriangle },
];

const DRONES = ['A1', 'A2', 'B1', 'B2'];

export function QuickControl() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [droneStates, setDroneStates] = useState<DroneControlState[]>([]);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // Use telemetry context
  const { drones, isConnected, sendCommand } = useTelemetry();

  // Keyboard shortcut to toggle admin panel (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsVisible(!isVisible);
      }
      // ESC to hide
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  // Load current drone states and check backend status
  useEffect(() => {
    if (isVisible) {
      fetchDroneStates();
      checkBackendStatus();
    }
  }, [isVisible]);

  // Check backend connectivity status
  const checkBackendStatus = () => {
    setBackendStatus(isConnected ? 'connected' : 'disconnected');
  };

  const fetchDroneStates = async () => {
    try {
      // Try to get drones from the telemetry context first
      if (drones.length > 0) {
        const states: DroneControlState[] = drones.map(drone => ({
          droneId: drone.id,
          status: drone.status,
          isOnline: drone.isOnline,
          battery: drone.battery,
        }));
        setDroneStates(states);
        return;
      }
    } catch (error) {
      console.warn('Failed to fetch drones from telemetry context:', error);
    }

    // Fallback: Try the old API endpoint
    try {
      const response = await fetch('/api/admin/drone-control');
      if (response.ok) {
        const data = await response.json();
        setDroneStates(data.states || []);
      }
    } catch (error) {
      console.error('Failed to fetch drone states from fallback API:', error);
      
      // Final fallback: Create default states
      const defaultStates: DroneControlState[] = DRONES.map(droneId => ({
        droneId,
        status: 'Standby',
        isOnline: true,
        battery: 85 + Math.random() * 15,
      }));
      setDroneStates(defaultStates);
    }
  };

  const updateDroneStatus = async (droneId: string, status: string, options: { battery?: number; isOnline?: boolean } = {}) => {
    setIsLoading(true);
    setFeedback('');

    try {
      // Try to send command via WebSocket if available
      if (isConnected) {
        try {
          // Use the telemetry context to send commands
          await sendCommand(droneId, 'status_update', {
            status,
            battery: options.battery,
            isOnline: options.isOnline,
          });
          
          setFeedback(`✅ Command sent via WebSocket for drone ${droneId}`);
        } catch (backendError) {
          console.warn('WebSocket command failed, using local state:', backendError);
          // Fall through to local state update
        }
      }

      // Update local state regardless of backend success
      setDroneStates(prev => {
        const updated = prev.filter(d => d.droneId !== droneId);
        updated.push({
          droneId,
          status,
          isOnline: options.isOnline !== undefined ? options.isOnline : true,
          battery: options.battery,
        });
        return updated;
      });

      setFeedback(`✅ Drone ${droneId} status updated to ${status}`);
      
      // Clear feedback after 2 seconds
      setTimeout(() => setFeedback(''), 2000);
    } catch (error) {
      setFeedback('❌ Error updating drone status');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action buttons
  const quickActions = [
    {
      label: 'Start All Drones',
      action: () => {
        DRONES.forEach(droneId => 
          updateDroneStatus(droneId, 'Active', { battery: 85 + Math.random() * 15 })
        );
      },
      color: 'bg-green-600 hover:bg-green-700',
      icon: Play,
    },
    {
      label: 'Power Off All',
      action: () => {
        DRONES.forEach(droneId => 
          updateDroneStatus(droneId, 'Powered Off', { isOnline: false })
        );
      },
      color: 'bg-red-600 hover:bg-red-700',
      icon: Power,
    },
    {
      label: 'Set to Standby',
      action: () => {
        DRONES.forEach(droneId => 
          updateDroneStatus(droneId, 'Standby', { battery: 90 + Math.random() * 10 })
        );
      },
      color: 'bg-yellow-600 hover:bg-yellow-700',
      icon: Square,
    },
    {
      label: 'Emergency Stop',
      action: () => {
        DRONES.forEach(droneId => 
          updateDroneStatus(droneId, 'Emergency', { battery: Math.random() * 30 + 20 })
        );
      },
      color: 'bg-red-700 hover:bg-red-800',
      icon: AlertTriangle,
    },
  ];

  // Get backend status indicator
  const getBackendStatusIndicator = () => {
    switch (backendStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Server className="h-4 w-4" />
            <span>Backend Connected</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center space-x-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Local Control Only</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4 animate-pulse" />
            <span>Checking Connection...</span>
          </div>
        );
    }
  };

  if (!isVisible) {
    return (
      <>
       
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-card/95 backdrop-blur border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Live Demo Control Panel</span>
          </CardTitle>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Backend Status */}
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center space-x-4">
              {getBackendStatusIndicator()}
              <span className="text-xs text-muted-foreground">
                {backendStatus === 'connected' 
                  ? 'Commands will be sent via WebSocket' 
                  : 'Commands will update local state only'}
              </span>
            </div>
            <Button
              onClick={checkBackendStatus}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Refresh Status
            </Button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className="text-sm">{feedback}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    onClick={action.action}
                    disabled={isLoading}
                    className={`${action.color} text-white flex flex-col items-center p-4 h-auto`}
                  >
                    <Icon className="h-5 w-5 mb-2" />
                    <span className="text-xs text-center">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Individual Drone Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Individual Drone Control</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DRONES.map((droneId) => {
                const currentState = droneStates.find(s => s.droneId === droneId);
                return (
                  <Card key={droneId} className="bg-secondary/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Drone {droneId}</span>
                        <div className="text-xs text-muted-foreground">
                          {currentState?.status || 'Unknown'}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2">
                        {DRONE_STATUSES.slice(0, 6).map((status) => {
                          const Icon = status.icon;
                          return (
                            <Button
                              key={status.value}
                              onClick={() => updateDroneStatus(droneId, status.value)}
                              disabled={isLoading}
                              variant="outline"
                              size="sm"
                              className="flex flex-col items-center p-2 h-auto text-xs"
                            >
                              <Icon className="h-3 w-3 mb-1" />
                              {status.label}
                            </Button>
                          );
                        })}
                      </div>
                      
                      {/* Additional controls */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <Button
                          onClick={() => updateDroneStatus(droneId, 'In Flight', { battery: 70 + Math.random() * 20 })}
                          disabled={isLoading}
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          Launch Mission
                        </Button>
                        <Button
                          onClick={() => updateDroneStatus(droneId, 'Powered Off', { isOnline: false })}
                          disabled={isLoading}
                          size="sm"
                          variant="destructive"
                        >
                          Power Off
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg">
            <p className="font-semibold mb-1">Quick Access:</p>
            <p>• Press <kbd className="px-1 py-0.5 bg-secondary rounded">Ctrl+Shift+A</kbd> to toggle this panel</p>
            <p>• Press <kbd className="px-1 py-0.5 bg-secondary rounded">Escape</kbd> to hide</p>
            <p>• Changes are reflected instantly on the dashboard</p>
            <p className="mt-2 text-amber-600">
              {backendStatus === 'connected' 
                ? '✅ Commands will be sent via WebSocket when available' 
                : '⚠️ Commands will update local state only'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}