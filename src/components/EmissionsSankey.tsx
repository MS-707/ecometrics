'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';

interface SankeyData {
  nodes: { name: string; category: string }[];
  links: { source: number; target: number; value: number }[];
}

interface EmissionsSankeyProps {
  electricity: number; // kWh
  naturalGas: number; // therms
  transportMiles: number; // miles
  scope1: number; // kg CO2
  scope2: number; // kg CO2
  scope3: number; // kg CO2
  width?: number;
  height?: number;
}

// EPA Emission Factors for reference in tooltips
const EMISSION_FACTORS = {
  electricity: 0.417, // kg CO2/kWh
  naturalGas: 5.3, // kg CO2/therm
  transport: 0.161, // kg CO2/mile
};

export default function EmissionsSankey({
  electricity,
  naturalGas,
  transportMiles,
  scope1,
  scope2,
  scope3,
  width = 800,
  height = 500,
}: EmissionsSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Build Sankey data from props
  const buildSankeyData = (): SankeyData => {
    const total = scope1 + scope2 + scope3;

    return {
      nodes: [
        // Sources (left) - index 0-2
        { name: \`Electricity\n\${electricity.toLocaleString()} kWh\`, category: 'source' },
        { name: \`Natural Gas\n\${naturalGas.toLocaleString()} therms\`, category: 'source' },
        { name: \`Transport\n\${transportMiles.toLocaleString()} miles\`, category: 'source' },
        // Process (middle) - index 3
        { name: 'Facility\nOperations', category: 'process' },
        // Outputs (right) - index 4-6
        { name: \`Scope 2\n\${(scope2 / 1000).toFixed(1)}t CO₂\`, category: 'scope2' },
        { name: \`Scope 1\n\${(scope1 / 1000).toFixed(1)}t CO₂\`, category: 'scope1' },
        { name: \`Scope 3\n\${(scope3 / 1000).toFixed(1)}t CO₂\`, category: 'scope3' },
        // Total (far right) - index 7
        { name: \`Total Emissions\n\${(total / 1000).toFixed(1)} metric tons\`, category: 'total' },
      ],
      links: [
        // Sources to Facility
        { source: 0, target: 3, value: scope2 }, // Electricity → Facility
        { source: 1, target: 3, value: scope1 }, // Gas → Facility
        { source: 2, target: 3, value: scope3 }, // Transport → Facility
        // Facility to Scopes
        { source: 3, target: 4, value: scope2 }, // Facility → Scope 2
        { source: 3, target: 5, value: scope1 }, // Facility → Scope 1
        { source: 3, target: 6, value: scope3 }, // Facility → Scope 3
        // Scopes to Total
        { source: 4, target: 7, value: scope2 }, // Scope 2 → Total
        { source: 5, target: 7, value: scope1 }, // Scope 1 → Total
        { source: 6, target: 7, value: scope3 }, // Scope 3 → Total
      ],
    };
  };

  // Color scale
  const getColor = (category: string): string => {
    const colors: Record<string, string> = {
      source: '#6366F1', // Indigo for inputs
      process: '#8B5CF6', // Purple for facility
      scope1: '#F59E0B', // Amber for Scope 1
      scope2: '#3B82F6', // Blue for Scope 2
      scope3: '#8B5CF6', // Purple for Scope 3
      total: '#10B981', // Green for total
    };
    return colors[category] || '#6B7280';
  };

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(containerWidth, 600),
          height: Math.max(containerWidth * 0.5, 400),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 rendering with animations
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width: w, height: h } = dimensions;
    const margin = { top: 20, right: 120, bottom: 20, left: 20 };
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = h - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group
    const g = svg
      .attr('width', w)
      .attr('height', h)
      .append('g')
      .attr('transform', \`translate(\${margin.left},\${margin.top})\`);

    // Build data
    const data = buildSankeyData();

    // Create Sankey generator
    const sankeyGenerator = sankey<{ name: string; category: string }, {}>()
      .nodeId((d: any) => d.index)
      .nodeWidth(20)
      .nodePadding(24)
      .extent([[0, 0], [innerWidth, innerHeight]]);

    // Generate layout
    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map((d) => ({ ...d })),
      links: data.links.map((d) => ({ ...d })),
    });

    // Create gradient definitions for links
    const defs = svg.append('defs');

    links.forEach((link: any, i: number) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', \`gradient-\${i}\`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', (link.source as any).x1)
        .attr('x2', (link.target as any).x0);

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', getColor((link.source as any).category))
        .attr('stop-opacity', 0.8);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', getColor((link.target as any).category))
        .attr('stop-opacity', 0.8);
    });

    // Draw links with animation
    const linkPaths = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', (d: any, i: number) => \`url(#gradient-\${i})\`)
      .attr('stroke-width', 0)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Animate links appearing
    linkPaths
      .transition()
      .duration(1000)
      .delay((d: any, i: number) => i * 100)
      .ease(d3.easeCubicOut)
      .attr('stroke-width', (d: any) => Math.max(1, d.width));

    // Link hover effects
    linkPaths
      .on('mouseenter', function (event: any, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke-width', (d: any) => Math.max(1, d.width) + 4);

        const sourceNode = d.source as any;
        const targetNode = d.target as any;
        const value = d.value as number;

        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: \`\${sourceNode.name.split('\n')[0]} → \${targetNode.name.split('\n')[0]}\n\${(value / 1000).toFixed(2)} metric tons CO₂\`,
        });
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.7)
          .attr('stroke-width', (d: any) => Math.max(1, d.width));
        setTooltip(null);
      });

    // Draw nodes
    const nodeGroups = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', (d: any) => \`translate(\${d.x0},\${d.y0})\`);

    // Node rectangles with animation
    nodeGroups
      .append('rect')
      .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
      .attr('width', 0)
      .attr('fill', (d: any) => getColor(d.category))
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .transition()
      .duration(800)
      .delay((d: any, i: number) => i * 80)
      .ease(d3.easeCubicOut)
      .attr('width', sankeyGenerator.nodeWidth());

    // Node hover effects
    nodeGroups
      .selectAll('rect')
      .on('mouseenter', function (event: any, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('width', sankeyGenerator.nodeWidth() + 4);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.9)
          .attr('width', sankeyGenerator.nodeWidth());
      });

    // Node labels
    nodeGroups
      .append('text')
      .attr('x', (d: any) => (d.x0 < innerWidth / 2 ? sankeyGenerator.nodeWidth() + 8 : -8))
      .attr('y', (d: any) => (d.y1 - d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 < innerWidth / 2 ? 'start' : 'end'))
      .attr('fill', '#E5E7EB')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('opacity', 0)
      .text((d: any) => d.name.split('\n')[0])
      .transition()
      .duration(600)
      .delay((d: any, i: number) => 400 + i * 80)
      .attr('opacity', 1);

    // Value labels (second line)
    nodeGroups
      .append('text')
      .attr('x', (d: any) => (d.x0 < innerWidth / 2 ? sankeyGenerator.nodeWidth() + 8 : -8))
      .attr('y', (d: any) => (d.y1 - d.y0) / 2 + 16)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 < innerWidth / 2 ? 'start' : 'end'))
      .attr('fill', '#9CA3AF')
      .attr('font-size', '11px')
      .attr('opacity', 0)
      .text((d: any) => d.name.split('\n')[1] || '')
      .transition()
      .duration(600)
      .delay((d: any, i: number) => 500 + i * 80)
      .attr('opacity', 1);

    // Animated particles flowing through links
    const animateParticles = () => {
      links.forEach((link: any, linkIndex: number) => {
        const particleCount = Math.ceil(link.value / 2000); // More particles for larger flows

        for (let i = 0; i < Math.min(particleCount, 5); i++) {
          setTimeout(() => {
            const particle = g
              .append('circle')
              .attr('r', 3)
              .attr('fill', getColor((link.target as any).category))
              .attr('opacity', 0.8);

            const path = linkPaths.nodes()[linkIndex] as SVGPathElement;
            const pathLength = path.getTotalLength();

            particle
              .attr('cx', (link.source as any).x1)
              .attr('cy', ((link.source as any).y0 + (link.source as any).y1) / 2 + (Math.random() - 0.5) * link.width * 0.6)
              .transition()
              .duration(2000 + Math.random() * 1000)
              .ease(d3.easeLinear)
              .attrTween('cx', () => {
                return (t: number) => {
                  const point = path.getPointAtLength(t * pathLength);
                  return String(point.x);
                };
              })
              .attrTween('cy', () => {
                return (t: number) => {
                  const point = path.getPointAtLength(t * pathLength);
                  return String(point.y + (Math.random() - 0.5) * 10);
                };
              })
              .remove();
          }, i * 400 + Math.random() * 600);
        }
      });
    };

    // Start particle animation after initial render
    const particleInterval = setInterval(animateParticles, 3000);
    setTimeout(animateParticles, 1500);

    return () => clearInterval(particleInterval);
  }, [dimensions, electricity, naturalGas, transportMiles, scope1, scope2, scope3]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 bg-background-primary border border-border-subtle rounded-lg shadow-xl text-sm pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          {tooltip.content.split('\n').map((line, i) => (
            <div key={i} className={i === 0 ? 'text-white font-medium' : 'text-gray-400'}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#6366F1]" />
          <span className="text-gray-400">Energy Inputs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#F59E0B]" />
          <span className="text-gray-400">Scope 1 (Direct)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#3B82F6]" />
          <span className="text-gray-400">Scope 2 (Electricity)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#8B5CF6]" />
          <span className="text-gray-400">Scope 3 (Indirect)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#10B981]" />
          <span className="text-gray-400">Total Emissions</span>
        </div>
      </div>
    </div>
  );
}
