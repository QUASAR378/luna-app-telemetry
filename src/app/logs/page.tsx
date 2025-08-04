'use client';

import React, { useState, useEffect } from 'react';
import { TelemetryData } from '@/types/telemetry';
import { TelemetryTable } from '@/components/dashboard/TelemetryTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<TelemetryData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    droneId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  const itemsPerPage = 20;

  const fetchLogs = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      const response = await fetch(`/api/telemetry?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalCount(data.total || 0);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      const response = await fetch(`/api/telemetry?${params}`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `lunadrone-telemetry-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      droneId: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-400 mb-4">Error: {error}</p>
            <Button onClick={() => fetchLogs(currentPage)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Telemetry Logs</h1>
        <p className="text-muted-foreground">
          Historical telemetry data from all drones
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Drone ID</label>
              <input
                type="text"
                placeholder="e.g., A1"
                value={filters.droneId}
                onChange={(e) => handleFilterChange('droneId', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              >
                <option value="">All Statuses</option>
                <option value="Idle">Idle</option>
                <option value="In Transit">In Transit</option>
                <option value="Returning">Returning</option>
                <option value="Delivered">Delivered</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Date From</label>
              <input
                type="datetime-local"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Date To</label>
              <input
                type="datetime-local"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              />
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading logs...</p>
          </CardContent>
        </Card>
      ) : (
        <TelemetryTable
          data={logs}
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onExportCSV={handleExportCSV}
        />
      )}
    </div>
  );
}