import { NextRequest, NextResponse } from 'next/server';
import Telemetry from '@/models/Telemetry';
import { connectDB } from '@/lib/db';

// In-memory store for instant status changes
const droneStates = new Map<string, {
  status: string;
  isOnline: boolean;
  battery?: number;
  lastUpdate: Date;
}>();

export async function POST(request: NextRequest) {
  try {
    const { droneId, status, isOnline, battery } = await request.json();
    
    if (!droneId || !status) {
      return NextResponse.json(
        { error: 'DroneId and status are required' },
        { status: 400 }
      );
    }

    // Update in-memory state for instant response
    droneStates.set(droneId, {
      status,
      isOnline: isOnline !== undefined ? isOnline : true,
      battery: battery !== undefined ? battery : undefined,
      lastUpdate: new Date(),
    });

    // Also update database with new telemetry record
    await connectDB();
    
    // Get the most recent telemetry for this drone
    const lastTelemetry = await Telemetry.findOne({ droneId }).sort({ timestamp: -1 });
    
    // Create new telemetry record with updated status
    const newTelemetry = new Telemetry({
      droneId,
      timestamp: new Date(),
      battery: battery !== undefined ? battery : (lastTelemetry?.battery || 85),
      temperature: lastTelemetry?.temperature || 28,
      humidity: lastTelemetry?.humidity || 65,
      speed: status === 'In Flight' ? 45 : 0,
      altitude: status === 'In Flight' ? 150 : 0,
      lat: lastTelemetry?.lat || -1.2921,
      lng: lastTelemetry?.lng || 36.8219,
      status,
    });

    await newTelemetry.save();

    return NextResponse.json({
      success: true,
      message: `Drone ${droneId} status updated to ${status}`,
      droneId,
      status,
      isOnline,
      battery,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Drone control error:', error);
    return NextResponse.json(
      { error: 'Failed to update drone status' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const droneId = searchParams.get('droneId');

    if (droneId) {
      // Get specific drone state
      const state = droneStates.get(droneId);
      if (state) {
        return NextResponse.json({
          success: true,
          droneId,
          ...state,
        });
      }
    }

    // Get all drone states
    const allStates = Array.from(droneStates.entries()).map(([id, state]) => ({
      droneId: id,
      ...state,
    }));

    return NextResponse.json({
      success: true,
      states: allStates,
    });

  } catch (error) {
    console.error('Get drone states error:', error);
    return NextResponse.json(
      { error: 'Failed to get drone states' },
      { status: 500 }
    );
  }
}