'use client';

import React, { useState } from 'react';
import { TelemetryData } from '@/types/telemetry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTimestamp, getStatusColor } from '@/lib/utils';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface TelemetryTableProps {
  data: TelemetryData[];
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onExportCSV: () => void;
}

export function TelemetryTable({
  data,
  totalCount,
  currentPage,
  onPageChange,
  onExportCSV,
}: TelemetryTableProps) {
  const [sortField, setSortField] = useState<keyof TelemetryData>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSort = (field: keyof TelemetryData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === undefined && bVal === undefined) return 0;
    if (aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Telemetry Logs</CardTitle>
        <Button onClick={onExportCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('timestamp')}
                >
                  Timestamp {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('droneId')}
                >
                  Drone ID {sortField === 'droneId' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('battery')}
                >
                  Battery {sortField === 'battery' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('temperature')}
                >
                  Temp {sortField === 'temperature' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('humidity')}
                >
                  Humidity {sortField === 'humidity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('speed')}
                >
                  Speed {sortField === 'speed' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('altitude')}
                >
                  Altitude {sortField === 'altitude' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left p-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, index) => (
                <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs">
                    {formatTimestamp(row.timestamp)}
                  </td>
                  <td className="p-2 font-semibold">{row.droneId}</td>
                  <td className={`p-2 ${getStatusColor(row.status)}`}>
                    {row.status}
                  </td>
                  <td className="p-2">{row.battery}%</td>
                  <td className="p-2">{row.temperature}°C</td>
                  <td className="p-2">{row.humidity}%</td>
                  <td className="p-2">{row.speed} km/h</td>
                  <td className="p-2">{row.altitude}m</td>
                  <td className="p-2 font-mono text-xs">
                    {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}