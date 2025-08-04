import { NextRequest, NextResponse } from 'next/server';

import Telemetry from '@/models/Telemetry';
import { connectDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const droneId = searchParams.get('droneId');
    const since = searchParams.get('since');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const format = searchParams.get('format');
    
    // Build query
    const query: any = {};
    
    if (droneId) {
      query.droneId = droneId;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Date range filter
    if (since || dateFrom || dateTo) {
      query.timestamp = {};
      
      if (since) {
        query.timestamp.$gte = new Date(since);
      }
      
      if (dateFrom) {
        query.timestamp.$gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        query.timestamp.$lte = new Date(dateTo);
      }
    }
    
    // For CSV export, return all matching records
    if (format === 'csv') {
      const allData = await Telemetry.find(query)
        .sort({ timestamp: -1 })
        .lean();
      
      const csv = convertToCSV(allData);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="telemetry-export.csv"',
        },
      });
    }
    
    // Regular pagination
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      Telemetry.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Telemetry.countDocuments(query),
    ]);
    
    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
    
  } catch (error) {
    console.error('Telemetry API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch telemetry data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const telemetryData = await request.json();
    
    // Validate required fields
    const requiredFields = ['droneId', 'battery', 'temperature', 'humidity', 'speed', 'altitude', 'lat', 'lng', 'status'];
    const missingFields = requiredFields.filter(field => !(field in telemetryData));
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    const telemetry = new Telemetry({
      ...telemetryData,
      timestamp: new Date(telemetryData.timestamp || Date.now()),
    });
    
    await telemetry.save();
    
    return NextResponse.json({ 
      success: true, 
      id: telemetry._id,
      message: 'Telemetry data saved successfully' 
    });
    
  } catch (error) {
    console.error('Telemetry POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save telemetry data' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = ['timestamp', 'droneId', 'battery', 'temperature', 'humidity', 'speed', 'altitude', 'lat', 'lng', 'status'];
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}