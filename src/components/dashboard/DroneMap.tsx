'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TelemetryData } from '@/types/telemetry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DroneMapProps {
  telemetry: TelemetryData | null;
}

function MapUpdater({ telemetry }: { telemetry: TelemetryData | null }) {
  const map = useMap();

  useEffect(() => {
    if (telemetry) {
      map.setView([telemetry.lat, telemetry.lng], 13);
    }
  }, [map, telemetry]);

  return null;
}

 function DroneMap({ telemetry }: DroneMapProps) {
  // Default to Nairobi if no telemetry data
  const defaultLat = -1.2921;
  const defaultLng = 36.8219;

  const lat = telemetry?.lat ?? defaultLat;
  const lng = telemetry?.lng ?? defaultLng;

  return (
    <Card className="h-96">
      <CardHeader>
        <CardTitle>Live Drone Location</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 rounded-b-lg overflow-hidden">
          <MapContainer
            center={[lat, lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {telemetry && (
              <>
                <Marker position={[telemetry.lat, telemetry.lng]}>
                  <Popup>
                    <div>
                      <h3 className="font-semibold">Drone {telemetry.droneId}</h3>
                      <p>Status: {telemetry.status}</p>
                      <p>Altitude: {telemetry.altitude}m</p>
                      <p>Speed: {telemetry.speed}km/h</p>
                      <p>Battery: {telemetry.battery}%</p>
                    </div>
                  </Popup>
                </Marker>
                <MapUpdater telemetry={telemetry} />
              </>
            )}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
export default DroneMap;