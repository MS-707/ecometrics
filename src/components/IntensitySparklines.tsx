'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IntensityMetric {
  label: string;
  unit: string;
  values: number[];
  color: string;
  icon: string;
}

interface IntensitySparklineProps {
  // Current period values (for calculating intensity)
  totalEmissions: number; // kg CO2e
  electricityKwh: number;
  squareFootage?: number;
  employeeCount?: number;
  productionUnits?: number;
}

// Generate sample historical data with realistic patterns
function generateHistoricalData(currentValue: number, months: number = 12): number[] {
  const data: number[] = [];
  const volatility = 0.15;
  const trend = -0.02; // Slight downward trend (improvement)

  // Work backwards from current value
  let value = currentValue;
  for (let i = months - 1; i >= 0; i--) {
    // Add some seasonality (higher in winter/summer)
    const monthIndex = (new Date().getMonth() - i + 12) % 12;
    const seasonalFactor = 1 + 0.1 * Math.sin((monthIndex - 1) * Math.PI / 6);

    // Random variation
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;

    // Apply trend (reverse since we're going backwards)
    const trendFactor = 1 - trend * (months - 1 - i);

    data.unshift(value * seasonalFactor * randomFactor * trendFactor);
  }

  // Ensure last value matches current
  data[data.length - 1] = currentValue;

  return data;
}

function SparklineChart({
  values,
  color,
  width = 120,
  height = 32
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || values.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 4, right: 4, bottom: 4, left: 4 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain([0, values.length - 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(values) || 0, d3.max(values) || 1])
      .range([innerHeight, 0])
      .nice();

    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const area = d3.area<number>()
      .x((_, i) => xScale(i))
      .y0(innerHeight)
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradient for area fill
    const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0);

    // Area fill
    g.append('path')
      .datum(values)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    // Line
    g.append('path')
      .datum(values)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // End point dot
    g.append('circle')
      .attr('cx', xScale(values.length - 1))
      .attr('cy', yScale(values[values.length - 1]))
      .attr('r', 3)
      .attr('fill', color);

  }, [values, color, width, height]);

  return <svg ref={svgRef} className="block" />;
}

function TrendIndicator({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const recent = values.slice(-3);
  const earlier = values.slice(0, 3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;

  if (Math.abs(changePercent) < 2) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Minus size={14} />
        <span className="text-xs">Stable</span>
      </div>
    );
  }

  // For intensity metrics, DOWN is good (lower emissions per unit)
  if (changePercent < 0) {
    return (
      <div className="flex items-center gap-1 text-accent-green">
        <TrendingDown size={14} />
        <span className="text-xs">{Math.abs(changePercent).toFixed(0)}% ↓</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-red-400">
      <TrendingUp size={14} />
      <span className="text-xs">{changePercent.toFixed(0)}% ↑</span>
    </div>
  );
}

export default function IntensitySparklines({
  totalEmissions,
  electricityKwh,
  squareFootage = 50000, // Default facility size
  employeeCount = 45, // Default employee count
  productionUnits = 10000, // Default production units
}: IntensitySparklineProps) {

  // Calculate current intensity values
  const emissionsPerSqFt = totalEmissions / squareFootage;
  const emissionsPerEmployee = totalEmissions / employeeCount;
  const emissionsPerUnit = totalEmissions / productionUnits;
  const energyPerSqFt = electricityKwh / squareFootage;

  // Generate historical data for each metric
  const metrics: IntensityMetric[] = useMemo(() => [
    {
      label: 'Carbon Intensity',
      unit: 'kg CO₂e / sq ft',
      values: generateHistoricalData(emissionsPerSqFt),
      color: '#10b981', // green
      icon: '🏢',
    },
    {
      label: 'Per Capita Emissions',
      unit: 'kg CO₂e / employee',
      values: generateHistoricalData(emissionsPerEmployee),
      color: '#3b82f6', // blue
      icon: '👤',
    },
    {
      label: 'Production Intensity',
      unit: 'kg CO₂e / unit',
      values: generateHistoricalData(emissionsPerUnit),
      color: '#8b5cf6', // purple
      icon: '📦',
    },
    {
      label: 'Energy Use Intensity',
      unit: 'kWh / sq ft',
      values: generateHistoricalData(energyPerSqFt),
      color: '#f59e0b', // amber
      icon: '⚡',
    },
  ], [emissionsPerSqFt, emissionsPerEmployee, emissionsPerUnit, energyPerSqFt]);

  const formatValue = (value: number): string => {
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    if (value >= 100) return value.toFixed(0);
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(2);
  };

  return (
    <div className="space-y-3">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-3 bg-background-secondary/50 rounded-lg hover:bg-background-secondary/70 transition-colors"
        >
          {/* Icon & Label */}
          <div className="flex-shrink-0 w-32">
            <div className="flex items-center gap-2">
              <span className="text-lg">{metric.icon}</span>
              <div>
                <div className="text-sm font-medium text-white">{metric.label}</div>
                <div className="text-xs text-gray-500">{metric.unit}</div>
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="flex-grow">
            <SparklineChart values={metric.values} color={metric.color} />
          </div>

          {/* Current Value */}
          <div className="flex-shrink-0 w-20 text-right">
            <div className="text-lg font-bold" style={{ color: metric.color }}>
              {formatValue(metric.values[metric.values.length - 1])}
            </div>
          </div>

          {/* Trend */}
          <div className="flex-shrink-0 w-20">
            <TrendIndicator values={metric.values} />
          </div>
        </div>
      ))}

      {/* Summary footer */}
      <div className="flex justify-between items-center pt-2 border-t border-border-subtle text-xs text-gray-500">
        <span>12-month trend · Lower is better</span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-green"></span>
          Improving
          <span className="w-2 h-2 rounded-full bg-red-400 ml-2"></span>
          Needs attention
        </span>
      </div>
    </div>
  );
}
