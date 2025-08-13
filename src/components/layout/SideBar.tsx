'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Plane, 
  Activity, 
  FileText, 
  Home, 
  Settings, 
  Database,
  Wifi,
  BarChart3,
  MapPin,
  Battery,
  Shield
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigationItems: NavItem[] = [
  {
    href: '/',
    label: 'Overview',
    icon: Home,
    description: 'System overview and fleet status'
  },
  {
    href: '/dashboard',
    label: 'Operations',
    icon: Activity,
    description: 'Real-time drone monitoring'
  },
  {
    href: '/realtime',
    label: 'Real-Time',
    icon: Wifi,
    description: 'Live MQTT telemetry streams'
  },
  {
    href: '/logs',
    label: 'Mission Logs',
    icon: FileText,
    description: 'Flight history and analytics'
  },
];

const systemItems: NavItem[] = [
  {
    href: '#',
    label: 'Fleet Management',
    icon: MapPin,
    description: 'Drone configuration'
  },
  {
    href: '#',
    label: 'Power Systems',
    icon: Battery,
    description: 'Battery monitoring'
  },
  {
    href: '#',
    label: 'System Settings',
    icon: Settings,
    description: 'Configuration panel'
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
   <>
   <div className='w-80'></div>
    <aside className="w-80 bg-card/30 border-r fixed h-screen overflow-scroll scrollbar-none  border-border/50 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Lunadrone</h1>
            <p className="text-xs text-muted-foreground">Telemetry</p>
          </div>
        </div>
        
        {/* System Status */}
        <div className="flex items-center space-x-4 mt-4 p-3 bg-secondary/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs font-medium text-green-400">OPERATIONAL</span>
          </div>
          <div className="flex items-center space-x-2">
            <Wifi className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Data Link Active</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-8">
        {/* Primary Navigation */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            Navigation
          </h2>
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* System Navigation */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            System Management
          </h2>
          <ul className="space-y-1">
            {systemItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <li key={item.label}>
                  <button
                    className="group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    disabled
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground/50" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-muted-foreground/50">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground/30 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/50 bg-secondary/30 px-2 py-0.5 rounded text-center">
                      Soon
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-4">
        {/* Fleet Statistics */}
        <div className="bg-secondary/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-primary" />
            Fleet Status
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">4</div>
              <div className="text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">100%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>System Version</span>
            <span className="font-mono">v2.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Update</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Support */}
        <div className="pt-2 border-t border-border/30">
          <button className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <Shield className="h-3 w-3" />
            <span>System Health Check</span>
          </button>
        </div>
      </div>
    </aside>
   </>
  );
}