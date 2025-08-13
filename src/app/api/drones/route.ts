import { NextRequest, NextResponse } from 'next/server';

// This API route is now deprecated as we're using the backend
// The frontend now connects directly to the drone-monitoring-backend

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'This endpoint is deprecated. Please use the backend at /drone-monitoring-backend',
    status: 'deprecated',
    backendUrl: '/drone-monitoring-backend',
  });
}