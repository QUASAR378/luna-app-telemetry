import { NextRequest, NextResponse } from 'next/server';

import Telemetry from '@/models/Telemetry';
import { connectDB } from '@/lib/db';
import { PipelineStage } from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    // Get unique drone IDs and their latest telemetry
    const pipeline = [
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$droneId',
          lastSeen: { $first: '$timestamp' },
          status: { $first: '$status' },
          battery: { $first: '$battery' },
          lat: { $first: '$lat' },
          lng: { $first: '$lng' }
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: { $concat: ['Drone ', '$_id'] },
          lastSeen: 1,
          status: 1,
          battery: 1,
          lat: 1,
          lng: 1,
          isOnline: {
            $gt: [
              '$lastSeen',
              { $subtract: [new Date(), 5 * 60 * 1000] } // 5 minutes ago
            ]
          }
        }
      },
      {
        $sort: { id: 1 }
      }
    ];
    
    const drones = await Telemetry.aggregate(pipeline as PipelineStage[]);
    
    return NextResponse.json(drones);
    
  } catch (error) {
    console.error('Drones API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drone information' },
      { status: 500 }
    );
  }
}