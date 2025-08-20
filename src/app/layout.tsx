import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'
import './module.css';
import { Sidebar } from '@/components/layout/SideBar';
import { MobileSidebar } from '@/components/layout/MobileSideBar';
// import { initializeAutoSimulation } from '@/lib/auto-simulator'; // Removed - will be initialized on client side
import { TelemetryProvider } from '@/contexts/TelemetryContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lunadrone telemetry',
  description: 'Advanced telemetry monitoring for autonomous medical drone delivery operations',
};

// Auto-simulation will be initialized on the client side when needed

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TelemetryProvider 
          options={{
            enableWebSocket: true,
            enablePolling: true,
            pollingInterval: 15000,
            autoReconnect: true,
          }}
        >
          <div className="min-h-screen flex bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Mobile Sidebar */}
            <MobileSidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto px-6 py-8 max-w-none lg:ml-0 ml-0">
                {children}
              </div>
            </main>
          </div>
        </TelemetryProvider>
      </body>
    </html>
  );
}