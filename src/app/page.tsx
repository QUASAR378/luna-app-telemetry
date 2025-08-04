import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, Plane, MapPin, Battery, Thermometer, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Plane className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">Lunadrone Telemetry and Tracking</h1>
        </div>
        
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-primary" />
              <span>Operations Dashboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Monitor real-time telemetry data from active drone fleet including battery status, 
              GPS tracking, environmental sensors, and mission progress.
            </p>
            <Link href="/track/dashboard">
              <Button variant={'outline'} className="w-full cursor-pointer">Access Dashboard</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <span>Mission Logs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Access comprehensive flight logs, telemetry history, and mission analytics 
              for performance optimization and compliance reporting.
            </p>
            <Link href="/track/logs">
              <Button variant="outline" className="w-full cursor-pointer">View Logs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>



      {/* Fleet Status Overview */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-400" />
              <span>Fleet Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">4</div>
                <div className="text-sm text-muted-foreground">Active Drones</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Operations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">5km</div>
                <div className="text-sm text-muted-foreground">Service Radius</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}