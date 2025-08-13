import mqtt, { MqttClient } from "mqtt";

let client: MqttClient;

export const connectMQTT = (): MqttClient => {
  if (!client) {
    client = mqtt.connect("ws://localhost:9001", {
      clientId: "react-client-" + Math.random().toString(16).substr(2, 8),
    });

    client.on("connect", () => {
      console.log("✅ Connected to MQTT Broker");
      client.subscribe("/drone/telemetry");
    });

    client.on("error", (err) => {
      console.error("❌ MQTT Connection error:", err);
    });
  }
  return client;
};

export const publishMQTT = (topic: string, message: string) => {
  if (client && client.connected) {
    client.publish(topic, message);
  } else {
    console.warn("⚠️ MQTT not connected");
  }
};
