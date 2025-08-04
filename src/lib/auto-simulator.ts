import Telemetry from '../models/Telemetry';
import { TelemetryData } from '@/types/telemetry';
import { connectDB } from './db';

interface DroneProfile {
  id: string;
  name: string;
  baseLocation: { lat: number; lng: number };
  batteryDecayRate: number;
  maxSpeed: number;
  operatingAltitude: number;
  currentBattery: number;
  currentLocation: { lat: number; lng: number };
  missionPhase: 'idle' | 'preparing' | 'flying' | 'delivering' | 'returning';
  missionStartTime?: Date;
  destination?: { lat: number; lng: number; name: string };
}

class AutoDroneSimulator {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private profiles: Map<string, DroneProfile> = new Map();
  private destinations = [
    { lat: -1.2500, lng: 36.7833, name: 'Karen Hospital' },
    { lat: -1.3500, lng: 36.9167, name: 'Machakos Hospital' },
    { lat: -1.1667, lng: 36.8000, name: 'Kiambu Medical Center' },
    { lat: -1.4000, lng: 36.9500, name: 'Athi River Clinic' },
    { lat: -1.2000, lng: 36.7500, name: 'Limuru Health Center' },
  ];

  constructor() {
    this.initializeProfiles();
  }

  private initializeProfiles() {
    const initialProfiles: Omit<DroneProfile, 'currentBattery' | 'currentLocation' | 'missionPhase'>[] = [
      {
        id: 'A1',
        name: 'Drone A1',
        baseLocation: { lat: -1.2921, lng: 36.8219 }, // Nairobi City Centre
        batteryDecayRate: 0.8,
        maxSpeed: 65,
        operatingAltitude: 150,
      },
      {
        id: 'A2',
        name: 'Drone A2',
        baseLocation: { lat: -1.3032, lng: 36.8356 }, // Nairobi Hospital area
        batteryDecayRate: 0.7,
        maxSpeed: 70,
        operatingAltitude: 180,
      },
      {
        id: 'B1',
        name: 'Drone B1',
        baseLocation: { lat: -1.2745, lng: 36.8098 }, // Westlands
        batteryDecayRate: 0.9,
        maxSpeed: 60,
        operatingAltitude: 120,
      },
      {
        id: 'B2',
        name: 'Drone B2',
        baseLocation: { lat: -1.3167, lng: 36.8833 }, // Eastlands
        batteryDecayRate: 0.6,
        maxSpeed: 75,
        operatingAltitude: 200,
      },
    ];

    initialProfiles.forEach(profile => {
      this.profiles.set(profile.id, {
        ...profile,
        currentBattery: 85 + Math.random() * 15, // Start with 85-100%
        currentLocation: { ...profile.baseLocation },
        missionPhase: 'idle',
      });
    });
  }

  async start() {
    if (this.isRunning) return;
    
    console.log('🚀 Starting auto drone simulation...');
    
    try {
      await connectDB();
      
      // Generate initial historical data if database is empty
      await this.initializeDatabase();
      
      this.isRunning = true;
      
      // Generate data every 15 seconds for realistic real-time updates
      this.interval = setInterval(async () => {
        await this.generateAndSaveTelemetry();
      }, 15000);
      
      // Generate initial data immediately
      await this.generateAndSaveTelemetry();
      
      console.log('✅ Auto simulation started - generating data every 15 seconds');
    } catch (error) {
      console.error('❌ Failed to start simulation:', error);
    }
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('🛑 Auto simulation stopped');
  }

  private async initializeDatabase() {
    try {
      const count = await Telemetry.countDocuments();
      
      if (count === 0) {
        console.log('📊 Database is empty, generating initial historical data...');
        await this.generateHistoricalData(6); // 6 hours of history
        console.log('✅ Initial historical data generated');
      } else {
        console.log(`📊 Database has ${count} existing records`);
      }
    } catch (error) {
      console.error('❌ Failed to check/initialize database:', error);
    }
  }

  private async generateHistoricalData(hours: number) {
    const now = new Date();
    const intervalMinutes = 3; // Every 3 minutes
    const totalPoints = (hours * 60) / intervalMinutes;
    const batchData: TelemetryData[] = [];

    for (let i = totalPoints; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60000);
      
      Array.from(this.profiles.values()).forEach(profile => {
        const data = this.generateHistoricalDataPoint(profile, timestamp);
        batchData.push(data);
      });
    }

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < batchData.length; i += batchSize) {
      const batch = batchData.slice(i, i + batchSize);
      await Telemetry.insertMany(batch);
    }
  }

  private generateHistoricalDataPoint(profile: DroneProfile, timestamp: Date): TelemetryData {
    const isBusinessHours = timestamp.getHours() >= 8 && timestamp.getHours() <= 18;
    const isWeekend = timestamp.getDay() === 0 || timestamp.getDay() === 6;
    const activityLevel = isBusinessHours && !isWeekend ? 0.6 : 0.2;
    const isActive = Math.random() < activityLevel;

    if (isActive) {
      // Active mission data
      const missionProgress = Math.random();
      const battery = 90 - missionProgress * 40 + Math.random() * 10;
      const temperature = 32 + missionProgress * 8 + Math.random() * 4;
      const speed = profile.maxSpeed * (0.6 + Math.random() * 0.4);
      
      const latOffset = (Math.random() - 0.5) * 0.08;
      const lngOffset = (Math.random() - 0.5) * 0.08;

      return {
        droneId: profile.id,
        timestamp,
        battery: Math.round(Math.max(20, battery) * 10) / 10,
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round((55 + Math.random() * 25) * 10) / 10,
        speed: Math.round(speed * 10) / 10,
        altitude: profile.operatingAltitude + Math.random() * 40 - 20,
        lat: Math.round((profile.baseLocation.lat + latOffset) * 1000000) / 1000000,
        lng: Math.round((profile.baseLocation.lng + lngOffset) * 1000000) / 1000000,
        status: ['In Transit', 'Returning', 'Delivered'][Math.floor(Math.random() * 3)] as any,
      };
    } else {
      // Idle data
      return {
        droneId: profile.id,
        timestamp,
        battery: 85 + Math.random() * 15,
        temperature: 26 + Math.random() * 4,
        humidity: 60 + Math.random() * 20,
        speed: 0,
        altitude: 0,
        lat: profile.baseLocation.lat,
        lng: profile.baseLocation.lng,
        status: 'Standby',
      };
    }
  }

  private async generateAndSaveTelemetry() {
    try {
      const telemetryData: TelemetryData[] = [];
      const now = new Date();

      for (const [droneId, profile] of this.profiles) {
        // Update drone state
        this.updateDroneState(profile);
        
        // Generate telemetry based on current state
        const data = this.generateCurrentTelemetry(profile, now);
        telemetryData.push(data);
      }

      // Save to database
      await Telemetry.insertMany(telemetryData);
      
      // Log summary (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📡 [${now.toLocaleTimeString()}] Generated telemetry:`);
        telemetryData.forEach(data => {
          const location = data.speed > 0 ? 
            `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` : 'base';
          console.log(`   ${data.droneId}: ${data.status.padEnd(11)} | ${data.battery}% | ${Math.round(data.speed)} km/h | ${location}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to generate/save telemetry:', error);
    }
  }

  private updateDroneState(profile: DroneProfile) {
    const now = new Date();
    
    switch (profile.missionPhase) {
      case 'idle':
        // Chance to start a new mission during business hours
        const isBusinessHours = now.getHours() >= 8 && now.getHours() <= 18;
        const shouldStartMission = isBusinessHours && Math.random() < 0.15; // 15% chance every cycle
        
        if (shouldStartMission && profile.currentBattery > 40) {
          profile.missionPhase = 'preparing';
          profile.missionStartTime = now;
          profile.destination = this.destinations[Math.floor(Math.random() * this.destinations.length)];
        } else {
          // Charge battery when idle
          profile.currentBattery = Math.min(100, profile.currentBattery + 0.5);
        }
        break;

      case 'preparing':
        // Preparation takes 1-2 cycles, then start flying
        if (Math.random() < 0.7) {
          profile.missionPhase = 'flying';
        }
        break;

      case 'flying':
        // Move towards destination and drain battery
        if (profile.destination) {
          this.moveTowardsDestination(profile, profile.destination);
          profile.currentBattery -= profile.batteryDecayRate;
          
          // Check if reached destination or battery low
          const distanceToDestination = this.calculateDistance(
            profile.currentLocation, 
            profile.destination
          );
          
          if (distanceToDestination < 0.005 || Math.random() < 0.1) { // ~500m or 10% chance
            profile.missionPhase = 'delivering';
          }
        }
        break;

      case 'delivering':
        // Delivering takes a few cycles
        profile.currentBattery -= 0.2;
        if (Math.random() < 0.4) { // 40% chance to finish delivery
          profile.missionPhase = 'returning';
        }
        break;

      case 'returning':
        // Return to base
        this.moveTowardsDestination(profile, profile.baseLocation);
        profile.currentBattery -= profile.batteryDecayRate * 0.8; // Less drain returning
        
        const distanceToBase = this.calculateDistance(
          profile.currentLocation, 
          profile.baseLocation
        );
        
        if (distanceToBase < 0.002 || Math.random() < 0.15) { // ~200m or 15% chance
          profile.missionPhase = 'idle';
          profile.currentLocation = { ...profile.baseLocation };
          profile.destination = undefined;
          profile.missionStartTime = undefined;
        }
        break;
    }

    // Ensure battery doesn't go below 15%
    profile.currentBattery = Math.max(15, profile.currentBattery);
  }

  private moveTowardsDestination(
    profile: DroneProfile, 
    destination: { lat: number; lng: number }
  ) {
    const speed = profile.maxSpeed;
    const timeStep = 15 / 3600; // 15 seconds in hours
    const distanceStep = speed * timeStep; // km
    const degreeStep = distanceStep / 111; // Rough conversion to degrees
    
    const latDiff = destination.lat - profile.currentLocation.lat;
    const lngDiff = destination.lng - profile.currentLocation.lng;
    const totalDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    if (totalDistance > 0) {
      const stepRatio = Math.min(degreeStep / totalDistance, 1);
      profile.currentLocation.lat += latDiff * stepRatio;
      profile.currentLocation.lng += lngDiff * stepRatio;
    }
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const latDiff = point2.lat - point1.lat;
    const lngDiff = point2.lng - point1.lng;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  private generateCurrentTelemetry(profile: DroneProfile, timestamp: Date): TelemetryData {
    let status: TelemetryData['status'];
    let speed = 0;
    let altitude = 0;
    let temperature = 26 + Math.random() * 4; // Base temperature

    switch (profile.missionPhase) {
      case 'idle':
        status = 'Standby';
        temperature = 25 + Math.random() * 3;
        break;
      case 'preparing':
        status = 'Standby';
        speed = 0;
        temperature = 28 + Math.random() * 3; // Warming up
        break;
      case 'flying':
        status = 'In Flight';
        speed = profile.maxSpeed * (0.8 + Math.random() * 0.2);
        altitude = profile.operatingAltitude + Math.random() * 30 - 15;
        temperature = 35 + Math.random() * 6; // Hot during flight
        break;
      case 'delivering':
        status = 'Delivered';
        speed = 0;
        altitude = 0;
        temperature = 32 + Math.random() * 4;
        break;
      case 'returning':
        status = 'Returning';
        speed = profile.maxSpeed * (0.7 + Math.random() * 0.2);
        altitude = profile.operatingAltitude + Math.random() * 25 - 10;
        temperature = 34 + Math.random() * 5;
        break;
    }

    // Add some realistic environmental variations
    const timeOfDay = timestamp.getHours();
    const tempAdjustment = Math.sin((timeOfDay - 6) / 12 * Math.PI) * 3; // Day/night cycle
    const humidityBase = 65 - Math.abs(timeOfDay - 14) * 1.5; // Lower humidity mid-day

    return {
      droneId: profile.id,
      timestamp,
      battery: Math.round(profile.currentBattery * 10) / 10,
      temperature: Math.round((temperature + tempAdjustment) * 10) / 10,
      humidity: Math.round((humidityBase + Math.random() * 15) * 10) / 10,
      speed: Math.round(speed * 10) / 10,
      altitude: Math.round(altitude),
      lat: Math.round(profile.currentLocation.lat * 1000000) / 1000000,
      lng: Math.round(profile.currentLocation.lng * 1000000) / 1000000,
      status,
    };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      droneCount: this.profiles.size,
      profiles: Array.from(this.profiles.values()).map(p => ({
        id: p.id,
        name: p.name,
        battery: p.currentBattery,
        phase: p.missionPhase,
        location: p.currentLocation,
      })),
    };
  }
}

// Singleton instance
let autoSimulator: AutoDroneSimulator | null = null;

export function getAutoSimulator(): AutoDroneSimulator {
  if (!autoSimulator) {
    autoSimulator = new AutoDroneSimulator();
  }
  return autoSimulator;
}

// Auto-start when server starts (only once)
let hasStarted = false;

export async function initializeAutoSimulation() {
  if (hasStarted) return;
  hasStarted = true;
  
  // Small delay to ensure database is ready
  setTimeout(async () => {
    const simulator = getAutoSimulator();
    await simulator.start();
  }, 2000);
}