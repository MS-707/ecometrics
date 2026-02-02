'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

interface DayData {
  date: Date;
  value: number;
  electricity: number;
  gas: number;
}

interface ClimateCalendarProps {
  width?: number;
  height?: number;
}

// Generate sample daily data for the past year
function generateSampleData(): DayData[] {
  const data: DayData[] = [];
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const current = new Date(oneYearAgo);
  while (current <= today) {
    const dayOfWeek = current.getDay();
    const month = current.getMonth();

    // Base consumption varies by season (higher in summer/winter)
    const seasonalFactor = Math.abs(month - 6) / 6;
    const baseElectricity = 800 + seasonalFactor * 400;
    const baseGas = month >= 10 || month <= 2 ? 150 + Math.random() * 100 : 20 + Math.random() * 30;

    // Weekends have lower consumption
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.4 : 1;

    // Add some randomness
    const randomFactor = 0.7 + Math.random() * 0.6;

    const electricity = Math.round(baseElectricity * weekendFactor * randomFactor);
    const gas = Math.round(baseGas * weekendFactor * randomFactor);

    data.push({
      date: new Date(current),
      value: electricity + gas * 10, // Combined metric
      electricity,
      gas,
    });

    current.setDate(current.getDate() + 1);
  }

  return data;
}

export default function ClimateCalendar({ width: propWidth, height: propHeight }: ClimateCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 800, height: propHeight || 180 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: DayData } | null>(null);

  const data = useMemo(() => generateSampleData(), []);

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) return;

    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.min(containerWidth, 900),
          height: 180,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [propWidth, propHeight]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 20, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const cellSize = Math.min(14, (innerWidth - 52) / 53); // 53 weeks max
    const cellPadding = 2;

    // Color scale
    const maxValue = d3.max(data, d => d.value) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateGreens);

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Group data by week
    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];
    let lastWeekNum = -1;

    data.forEach(d => {
      const weekNum = d3.timeWeek.count(d3.timeYear(d.date), d.date);
      const yearWeekNum = d.date.getFullYear() * 100 + weekNum;

      if (yearWeekNum !== lastWeekNum && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(d);
      lastWeekNum = yearWeekNum;
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Day labels
    const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];
    g.selectAll('.day-label')
      .data(dayLabels)
      .join('text')
      .attr('class', 'day-label')
      .attr('x', -8)
      .attr('y', (_, i) => i * (cellSize + cellPadding) + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '9px')
      .text(d => d);

    // Month labels
    const months = d3.timeMonths(data[0].date, data[data.length - 1].date);
    g.selectAll('.month-label')
      .data(months)
      .join('text')
      .attr('class', 'month-label')
      .attr('x', d => {
        const weekIndex = weeks.findIndex(week =>
          week.some(day => day.date.getMonth() === d.getMonth() && day.date.getFullYear() === d.getFullYear())
        );
        return weekIndex * (cellSize + cellPadding);
      })
      .attr('y', -6)
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text(d => d3.timeFormat('%b')(d));

    // Draw cells
    weeks.forEach((week, weekIndex) => {
      const weekGroup = g.append('g')
        .attr('transform', 'translate(' + (weekIndex * (cellSize + cellPadding)) + ', 0)');

      weekGroup.selectAll('rect')
        .data(week)
        .join('rect')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('y', d => d.date.getDay() * (cellSize + cellPadding))
        .attr('rx', 2)
        .attr('fill', d => d.value === 0 ? '#1f2937' : colorScale(d.value))
        .attr('stroke', '#374151')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
          d3.select(this).attr('stroke', '#10b981').attr('stroke-width', 2);
          const rect = (event.target as SVGRectElement).getBoundingClientRect();
          setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top,
            data: d,
          });
        })
        .on('mouseleave', function() {
          d3.select(this).attr('stroke', '#374151').attr('stroke-width', 0.5);
          setTooltip(null);
        });
    });

    // Legend
    const legendWidth = 120;
    const legendHeight = 10;
    const legendX = innerWidth - legendWidth - 10;
    const legendY = innerHeight + 5;

    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(3)
      .tickFormat(d => d3.format('.0s')(d as number));

    // Legend gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'calendar-legend-gradient');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .join('stop')
      .attr('offset', d => d * 100 + '%')
      .attr('stop-color', d => colorScale(d * maxValue));

    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 2)
      .style('fill', 'url(#calendar-legend-gradient)');

    g.append('g')
      .attr('transform', 'translate(' + legendX + ',' + (legendY + legendHeight) + ')')
      .call(legendAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').remove())
      .call(g => g.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '8px'));

    g.append('text')
      .attr('x', legendX - 5)
      .attr('y', legendY + legendHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '9px')
      .text('Less');

    g.append('text')
      .attr('x', legendX + legendWidth + 5)
      .attr('y', legendY + legendHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '9px')
      .text('More');

  }, [data, dimensions]);

  const formatDate = (date: Date) => {
    return d3.timeFormat('%B %d, %Y')(date);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 bg-background-primary border border-border-subtle rounded-lg shadow-xl pointer-events-none text-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-white mb-1">{formatDate(tooltip.data.date)}</div>
          <div className="space-y-0.5 text-gray-400">
            <div className="flex justify-between gap-4">
              <span>Electricity:</span>
              <span className="text-accent-blue font-medium">{tooltip.data.electricity.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Natural Gas:</span>
              <span className="text-amber-400 font-medium">{tooltip.data.gas} therms</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex justify-center gap-6 mt-4 text-xs">
        <div className="text-center">
          <div className="text-accent-green font-bold">{data.length}</div>
          <div className="text-gray-500">Days tracked</div>
        </div>
        <div className="text-center">
          <div className="text-accent-blue font-bold">
            {Math.round(data.reduce((sum, d) => sum + d.electricity, 0) / 1000)}k
          </div>
          <div className="text-gray-500">Total kWh</div>
        </div>
        <div className="text-center">
          <div className="text-amber-400 font-bold">
            {Math.round(data.reduce((sum, d) => sum + d.gas, 0)).toLocaleString()}
          </div>
          <div className="text-gray-500">Total therms</div>
        </div>
      </div>
    </div>
  );
}
