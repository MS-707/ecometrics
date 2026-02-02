'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface EmissionsSunburstProps {
  scope1: number;
  scope2: number;
  scope3: number;
  electricity: number;
  naturalGas: number;
  transportMiles: number;
  width?: number;
  height?: number;
}

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  color?: string;
}

export default function EmissionsSunburst({
  scope1,
  scope2,
  scope3,
  electricity,
  naturalGas,
  transportMiles,
  width: propWidth,
  height: propHeight,
}: EmissionsSunburstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 400, height: propHeight || 400 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number; percent: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(['Total Emissions']);

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) return;

    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        const size = Math.min(containerWidth, 400);
        setDimensions({ width: size, height: size });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [propWidth, propHeight]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2 - 20;

    // Build hierarchy data
    const total = scope1 + scope2 + scope3;

    // Break down Scope 3 into transport categories
    const inboundPercent = 0.45;
    const outboundPercent = 0.35;
    const employeePercent = 0.20;

    const data: HierarchyNode = {
      name: 'Total Emissions',
      children: [
        {
          name: 'Scope 1',
          color: '#f59e0b',
          children: [
            { name: 'Natural Gas', value: scope1 * 0.85, color: '#fbbf24' },
            { name: 'Fuel Combustion', value: scope1 * 0.10, color: '#f97316' },
            { name: 'Refrigerants', value: scope1 * 0.05, color: '#ea580c' },
          ],
        },
        {
          name: 'Scope 2',
          color: '#3b82f6',
          children: [
            { name: 'Electricity', value: scope2 * 0.92, color: '#60a5fa' },
            { name: 'Purchased Steam', value: scope2 * 0.05, color: '#2563eb' },
            { name: 'Cooling', value: scope2 * 0.03, color: '#1d4ed8' },
          ],
        },
        {
          name: 'Scope 3',
          color: '#8b5cf6',
          children: [
            { name: 'Inbound Logistics', value: scope3 * inboundPercent, color: '#a78bfa' },
            { name: 'Outbound Logistics', value: scope3 * outboundPercent, color: '#7c3aed' },
            { name: 'Employee Commute', value: scope3 * employeePercent, color: '#6d28d9' },
          ],
        },
      ],
    };

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Arc generator
    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.02)
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');

    // Draw arcs
    const path = g.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('d', arc as any)
      .attr('fill', d => {
        if (d.data.color) return d.data.color;
        // Inherit from parent
        let node = d;
        while (node.parent && !node.data.color) {
          node = node.parent;
        }
        return node.data.color || '#6b7280';
      })
      .attr('fill-opacity', d => d.depth === 1 ? 0.9 : 0.7)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('fill-opacity', 1);
        const [x, y] = arc.centroid(d as any);
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          const percent = total > 0 ? ((d.value || 0) / total) * 100 : 0;
          setTooltip({
            x: svgRect.left + width / 2 + x,
            y: svgRect.top + height / 2 + y,
            name: d.data.name,
            value: d.value || 0,
            percent,
          });
        }
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).attr('fill-opacity', d.depth === 1 ? 0.9 : 0.7);
        setTooltip(null);
      });

    // Center text
    const centerGroup = g.append('g').attr('class', 'center-text');

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', -12)
      .attr('fill', '#ffffff')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .text(total >= 1000 ? (total / 1000).toFixed(1) + 't' : Math.round(total) + '');

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 12)
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px')
      .text('kg CO₂e');

    // Scope labels on the outer ring
    const labelArc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(radius - 5)
      .outerRadius(radius + 15);

    // Add labels for scope sections only
    g.selectAll('.scope-label')
      .data(root.descendants().filter(d => d.depth === 1))
      .join('text')
      .attr('class', 'scope-label')
      .attr('transform', d => {
        const node = d as d3.HierarchyRectangularNode<HierarchyNode>;
        const [x, y] = labelArc.centroid(node);
        const angle = (node.x0 + node.x1) / 2 * 180 / Math.PI;
        return 'translate(' + x + ',' + y + ') rotate(' + (angle > 180 ? angle - 270 : angle - 90) + ')';
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => d.data.name);

  }, [scope1, scope2, scope3, dimensions]);

  const total = scope1 + scope2 + scope3;

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      <svg ref={svgRef} />

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
          <div className="font-semibold text-white">{tooltip.name}</div>
          <div className="text-gray-400 mt-1">
            <span className="text-accent-green font-medium">
              {tooltip.value >= 1000 ? (tooltip.value / 1000).toFixed(2) + ' t' : tooltip.value.toFixed(0) + ' kg'}
            </span>
            {' '}CO₂e
          </div>
          <div className="text-gray-500">
            {tooltip.percent.toFixed(1)}% of total
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span className="text-gray-400">Scope 1</span>
          <span className="text-amber-400 font-semibold">
            {scope1 >= 1000 ? (scope1 / 1000).toFixed(1) + 't' : Math.round(scope1) + 'kg'}
          </span>
          <span className="text-gray-500">({total > 0 ? ((scope1 / total) * 100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-gray-400">Scope 2</span>
          <span className="text-blue-400 font-semibold">
            {scope2 >= 1000 ? (scope2 / 1000).toFixed(1) + 't' : Math.round(scope2) + 'kg'}
          </span>
          <span className="text-gray-500">({total > 0 ? ((scope2 / total) * 100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-purple-500" />
          <span className="text-gray-400">Scope 3</span>
          <span className="text-purple-400 font-semibold">
            {scope3 >= 1000 ? (scope3 / 1000).toFixed(1) + 't' : Math.round(scope3) + 'kg'}
          </span>
          <span className="text-gray-500">({total > 0 ? ((scope3 / total) * 100).toFixed(0) : 0}%)</span>
        </div>
      </div>
    </div>
  );
}
