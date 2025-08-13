import { NextRequest, NextResponse } from 'next/server';

// In-memory store for instant status changes (fallback when backend is unavailable)
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

    // Note: Database operations are now handled by the backend
    // This endpoint serves as a fallback for local state management

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