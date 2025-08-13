import React, { useEffect, useState } from "react";
import { connectMQTT } from "../services/mqttClient";
import { getTelemetry } from "../services/api";

interface TelemetryData {
  altitude: number;
  speed: number;
  battery: number;
  gps: { lat: number; lng: number };
  timestamp: string;
}

const TelemetryDisplay: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);

  useEffect(() => {
    const client = connectMQTT();

    // Get historical telemetry from backend
    getTelemetry().then(setTelemetry);

    // Listen for live MQTT telemetry
    client.on("message", (topic, payload) => {
      if (topic === "/drone/telemetry") {
        try {
          const data: TelemetryData = JSON.parse(payload.toString());
          setTelemetry((prev) => [data, ...prev].slice(0, 50)); // Keep latest 50
        } catch (err) {
          console.error("Error parsing telemetry:", err);
        }
      }
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <div>
      <h2>Drone Telemetry</h2>
      <table border={1} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Altitude</th>
            <th>Speed</th>
            <th>Battery</th>
            <th>GPS</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {telemetry.map((t, idx) => (
            <tr key={idx}>
              <td>{t.altitude} m</td>
              <td>{t.speed} m/s</td>
              <td>{t.battery}%</td>
              <td>{t.gps.lat}, {t.gps.lng}</td>
              <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TelemetryDisplay;
