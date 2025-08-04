'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGaugeColor } from '@/lib/utils';

interface MetricGaugeProps {
  title: string;
  value: number;
  unit: string;
  max: number;
  type: 'battery' | 'temperature' | 'humidity' | 'speed' | 'altitude';
  subtitle?: string;
}

export function MetricGauge({ title, value, unit, max, type, subtitle }: MetricGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const color = getGaugeColor(value, type);
  
  // Create segments for more realistic gauge appearance
  const segments = [
    { name: 'value', value: percentage },
    { name: 'remaining', value: 100 - percentage },
  ];

  // Get status color based on value ranges
  const getStatusColor = () => {
    switch (type) {
      case 'battery':
        if (value > 60) return 'text-green-400';
        if (value > 30) return 'text-yellow-400';
        return 'text-red-400';
      case 'temperature':
        if (value < 0 || value > 45) return 'text-red-400';
        if (value > 35) return 'text-yellow-400';
        return 'text-green-400';
      case 'humidity':
        if (value > 80) return 'text-red-400';
        if (value > 65) return 'text-yellow-400';
        return 'text-green-400';
      default:
        return 'text-green-400';
    }
  };

  const formatValue = (val: number) => {
    if (type === 'temperature') return val.toFixed(1);
    if (type === 'battery' || type === 'humidity') return Math.round(val).toString();
    if (type === 'speed') return val.toFixed(1);
    return Math.round(val).toString();
  };

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>{title}</span>
          <div className={`w-2 h-2 rounded-full ${
            type === 'battery' && value > 20 ? 'bg-green-400' :
            type === 'battery' && value <= 20 ? 'bg-red-400' :
            'bg-green-400'
          }`} />
        </CardTitle>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="relative pb-6">
        <div className="gauge-container h-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={35}
                outerRadius={55}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={color} />
                <Cell fill="#1f2937" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Value display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-2xl font-bold ${getStatusColor()}`}>
              {formatValue(value)}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {unit}
            </div>
          </div>
        </div>
        
        {/* Status bar */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">0</span>
          <div className="flex-1 mx-2 h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: color
              }} 
            />
          </div>
          <span className="text-muted-foreground">{max}</span>
        </div>
      </CardContent>
    </Card>
  );
}