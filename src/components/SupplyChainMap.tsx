'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface SupplyChainNode {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  material: string;
  annualVolume: string;
  transportMode: 'ship' | 'truck' | 'rail' | 'air';
  distanceKm: number;
  emissionsKgCO2: number;
  emissionFactor: number; // kg CO2 per ton-km
}

interface SupplyChainMapProps {
  width?: number;
  height?: number;
  facilityLocation?: { lat: number; lng: number; name: string };
}

// Sample supply chain data - representing typical manufacturing inputs
const SUPPLY_CHAIN_DATA: SupplyChainNode[] = [
  {
    id: 'supplier-1',
    name: 'Shanghai Electronics Co.',
    country: 'China',
    countryCode: 'CHN',
    lat: 31.2304,
    lng: 121.4737,
    material: 'Electronic Components',
    annualVolume: '45 tons',
    transportMode: 'ship',
    distanceKm: 11500,
    emissionsKgCO2: 2070,
    emissionFactor: 0.004, // Ocean freight
  },
  {
    id: 'supplier-2',
    name: 'Bavaria Steel GmbH',
    country: 'Germany',
    countryCode: 'DEU',
    lat: 48.1351,
    lng: 11.582,
    material: 'Steel Alloys',
    annualVolume: '120 tons',
    transportMode: 'ship',
    distanceKm: 7200,
    emissionsKgCO2: 3456,
    emissionFactor: 0.004,
  },
  {
    id: 'supplier-3',
    name: 'Monterrey Parts SA',
    country: 'Mexico',
    countryCode: 'MEX',
    lat: 25.6866,
    lng: -100.3161,
    material: 'Plastic Housings',
    annualVolume: '30 tons',
    transportMode: 'truck',
    distanceKm: 1800,
    emissionsKgCO2: 2700,
    emissionFactor: 0.05, // Road freight
  },
  {
    id: 'supplier-4',
    name: 'Toronto Chemicals Inc.',
    country: 'Canada',
    countryCode: 'CAN',
    lat: 43.6532,
    lng: -79.3832,
    material: 'Industrial Chemicals',
    annualVolume: '15 tons',
    transportMode: 'rail',
    distanceKm: 800,
    emissionsKgCO2: 360,
    emissionFactor: 0.03, // Rail freight
  },
  {
    id: 'supplier-5',
    name: 'Vietnam Textiles Ltd.',
    country: 'Vietnam',
    countryCode: 'VNM',
    lat: 10.8231,
    lng: 106.6297,
    material: 'Technical Fabrics',
    annualVolume: '8 tons',
    transportMode: 'ship',
    distanceKm: 14200,
    emissionsKgCO2: 454,
    emissionFactor: 0.004,
  },
  {
    id: 'supplier-6',
    name: 'UK Precision Ltd.',
    country: 'United Kingdom',
    countryCode: 'GBR',
    lat: 51.5074,
    lng: -0.1278,
    material: 'Precision Instruments',
    annualVolume: '2 tons',
    transportMode: 'air',
    distanceKm: 5900,
    emissionsKgCO2: 5900,
    emissionFactor: 0.5, // Air freight
  },
  {
    id: 'supplier-7',
    name: 'Brazil Mining Corp.',
    country: 'Brazil',
    countryCode: 'BRA',
    lat: -23.5505,
    lng: -46.6333,
    material: 'Raw Minerals',
    annualVolume: '200 tons',
    transportMode: 'ship',
    distanceKm: 8100,
    emissionsKgCO2: 6480,
    emissionFactor: 0.004,
  },
  {
    id: 'supplier-8',
    name: 'Japan Motors Co.',
    country: 'Japan',
    countryCode: 'JPN',
    lat: 35.6762,
    lng: 139.6503,
    material: 'Electric Motors',
    annualVolume: '25 tons',
    transportMode: 'ship',
    distanceKm: 10200,
    emissionsKgCO2: 1020,
    emissionFactor: 0.004,
  },
];

// Country carbon intensity data (kg CO2 per $ GDP - simplified)
const COUNTRY_INTENSITY: Record<string, number> = {
  CHN: 0.65,
  DEU: 0.18,
  MEX: 0.35,
  CAN: 0.32,
  VNM: 0.58,
  GBR: 0.15,
  BRA: 0.22,
  JPN: 0.23,
  USA: 0.28,
  IND: 0.72,
  KOR: 0.42,
  AUS: 0.38,
  FRA: 0.12,
  ITA: 0.19,
};

export default function SupplyChainMap({
  width = 900,
  height = 500,
  facilityLocation = { lat: 39.8283, lng: -98.5795, name: 'US Facility' }, // Center of US
}: SupplyChainMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: SupplyChainNode | null;
  } | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  // Calculate totals
  const totalEmissions = SUPPLY_CHAIN_DATA.reduce((sum, s) => sum + s.emissionsKgCO2, 0);
  const totalDistance = SUPPLY_CHAIN_DATA.reduce((sum, s) => sum + s.distanceKm, 0);

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(containerWidth, 600),
          height: Math.max(containerWidth * 0.55, 350),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 Map rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width: w, height: h } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    svg.attr('width', w).attr('height', h);

    // Create projection - Natural Earth for a nice look
    const projection = d3
      .geoNaturalEarth1()
      .scale(w / 5.5)
      .translate([w / 2, h / 2]);

    const path = d3.geoPath().projection(projection);

    // Background
    svg
      .append('rect')
      .attr('width', w)
      .attr('height', h)
      .attr('fill', '#0a0a0f');

    // Create main group
    const g = svg.append('g');

    // Draw simplified world outline
    const worldOutline = {
      type: 'Sphere',
    };

    g.append('path')
      .datum(worldOutline as any)
      .attr('d', path as any)
      .attr('fill', '#12121a')
      .attr('stroke', '#2d2d3d')
      .attr('stroke-width', 1);

    // Draw graticule (grid lines)
    const graticule = d3.geoGraticule().step([30, 30]);
    g.append('path')
      .datum(graticule())
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 0.5);

    // Draw simplified continent outlines using rough coordinates
    const continentPaths = [
      // North America (simplified)
      { name: 'North America', coords: [[-170, 70], [-60, 70], [-60, 15], [-100, 15], [-120, 30], [-170, 55], [-170, 70]] },
      // South America
      { name: 'South America', coords: [[-80, 10], [-35, 0], [-35, -55], [-75, -55], [-80, -5], [-80, 10]] },
      // Europe
      { name: 'Europe', coords: [[-10, 70], [50, 70], [50, 35], [-10, 35], [-10, 70]] },
      // Africa
      { name: 'Africa', coords: [[-20, 35], [50, 35], [50, -35], [15, -35], [-20, 5], [-20, 35]] },
      // Asia
      { name: 'Asia', coords: [[50, 70], [180, 70], [180, 10], [100, 10], [60, 25], [50, 35], [50, 70]] },
      // Australia
      { name: 'Australia', coords: [[110, -10], [155, -10], [155, -45], [110, -45], [110, -10]] },
    ];

    continentPaths.forEach((continent) => {
      const lineGenerator = d3
        .line()
        .x((d: any) => projection(d)?.[0] || 0)
        .y((d: any) => projection(d)?.[1] || 0)
        .curve(d3.curveCardinalClosed);

      g.append('path')
        .datum(continent.coords)
        .attr('d', lineGenerator as any)
        .attr('fill', '#1e1e2e')
        .attr('stroke', '#3d3d5c')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);
    });

    // Draw facility location
    const facilityPos = projection([facilityLocation.lng, facilityLocation.lat]);
    if (facilityPos) {
      // Pulsing facility marker
      const facilityGroup = g.append('g').attr('class', 'facility');

      // Outer pulse
      facilityGroup
        .append('circle')
        .attr('cx', facilityPos[0])
        .attr('cy', facilityPos[1])
        .attr('r', 8)
        .attr('fill', '#10B981')
        .attr('opacity', 0.3)
        .attr('class', 'pulse-ring');

      // Inner marker
      facilityGroup
        .append('circle')
        .attr('cx', facilityPos[0])
        .attr('cy', facilityPos[1])
        .attr('r', 6)
        .attr('fill', '#10B981')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // Label
      facilityGroup
        .append('text')
        .attr('x', facilityPos[0])
        .attr('y', facilityPos[1] - 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#10B981')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text('YOUR FACILITY');
    }

    // Create arc generator for supply routes
    const createArc = (source: [number, number], target: [number, number]) => {
      const sourceProj = projection(source);
      const targetProj = projection(target);
      if (!sourceProj || !targetProj) return '';

      const dx = targetProj[0] - sourceProj[0];
      const dy = targetProj[1] - sourceProj[1];
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;

      return 'M' + sourceProj[0] + ',' + sourceProj[1] + 'A' + dr + ',' + dr + ' 0 0,1 ' + targetProj[0] + ',' + targetProj[1];
    };

    // Color scale for emissions
    const emissionScale = d3
      .scaleLinear()
      .domain([0, Math.max(...SUPPLY_CHAIN_DATA.map((d) => d.emissionsKgCO2))])
      .range([0, 1]);

    const getRouteColor = (emissions: number) => {
      const t = emissionScale(emissions);
      return d3.interpolateRgb('#3B82F6', '#EF4444')(t);
    };

    // Draw supply routes with animation
    SUPPLY_CHAIN_DATA.forEach((supplier, i) => {
      const source: [number, number] = [supplier.lng, supplier.lat];
      const target: [number, number] = [facilityLocation.lng, facilityLocation.lat];
      const arcPath = createArc(source, target);

      if (!arcPath) return;

      const routeGroup = g.append('g').attr('class', 'route-' + supplier.id);

      // Route path (background)
      const route = routeGroup
        .append('path')
        .attr('d', arcPath)
        .attr('fill', 'none')
        .attr('stroke', getRouteColor(supplier.emissionsKgCO2))
        .attr('stroke-width', selectedSupplier === supplier.id ? 4 : 2)
        .attr('stroke-opacity', selectedSupplier === supplier.id ? 0.9 : 0.5)
        .attr('stroke-dasharray', function () {
          return (this as SVGPathElement).getTotalLength();
        })
        .attr('stroke-dashoffset', function () {
          return (this as SVGPathElement).getTotalLength();
        })
        .style('cursor', 'pointer');

      // Animate route appearance
      route
        .transition()
        .duration(1500)
        .delay(i * 200)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

      // Animated particle along route
      const animateParticle = () => {
        const particle = routeGroup
          .append('circle')
          .attr('r', 3)
          .attr('fill', getRouteColor(supplier.emissionsKgCO2))
          .attr('opacity', 0.9);

        const pathNode = route.node() as SVGPathElement;
        if (!pathNode) return;

        const pathLength = pathNode.getTotalLength();

        particle
          .attr('transform', () => {
            const p = pathNode.getPointAtLength(0);
            return 'translate(' + p.x + ',' + p.y + ')';
          })
          .transition()
          .duration(3000 + Math.random() * 2000)
          .ease(d3.easeLinear)
          .attrTween('transform', () => {
            return (t: number) => {
              const p = pathNode.getPointAtLength(t * pathLength);
              return 'translate(' + p.x + ',' + p.y + ')';
            };
          })
          .remove();
      };

      // Start particle animations with staggered delays
      setTimeout(() => {
        animateParticle();
        setInterval(animateParticle, 4000 + i * 500);
      }, 2000 + i * 300);

      // Supplier marker
      const supplierPos = projection([supplier.lng, supplier.lat]);
      if (supplierPos) {
        const marker = routeGroup
          .append('circle')
          .attr('cx', supplierPos[0])
          .attr('cy', supplierPos[1])
          .attr('r', 0)
          .attr('fill', getRouteColor(supplier.emissionsKgCO2))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer');

        marker
          .transition()
          .duration(500)
          .delay(1500 + i * 200)
          .attr('r', selectedSupplier === supplier.id ? 8 : 5);

        // Hover interactions
        marker
          .on('mouseenter', function (event) {
            d3.select(this).transition().duration(200).attr('r', 8);
            route.transition().duration(200).attr('stroke-width', 4).attr('stroke-opacity', 0.9);
            setTooltip({
              x: event.pageX,
              y: event.pageY,
              content: supplier,
            });
          })
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('r', selectedSupplier === supplier.id ? 8 : 5);
            route
              .transition()
              .duration(200)
              .attr('stroke-width', selectedSupplier === supplier.id ? 4 : 2)
              .attr('stroke-opacity', selectedSupplier === supplier.id ? 0.9 : 0.5);
            setTooltip(null);
          })
          .on('click', function () {
            setSelectedSupplier(selectedSupplier === supplier.id ? null : supplier.id);
          });

        // Route hover
        route
          .on('mouseenter', function (event) {
            d3.select(this).transition().duration(200).attr('stroke-width', 4).attr('stroke-opacity', 0.9);
            marker.transition().duration(200).attr('r', 8);
            setTooltip({
              x: event.pageX,
              y: event.pageY,
              content: supplier,
            });
          })
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('stroke-width', selectedSupplier === supplier.id ? 4 : 2)
              .attr('stroke-opacity', selectedSupplier === supplier.id ? 0.9 : 0.5);
            marker
              .transition()
              .duration(200)
              .attr('r', selectedSupplier === supplier.id ? 8 : 5);
            setTooltip(null);
          });
      }
    });

    // Add CSS animation for pulse
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { r: 8; opacity: 0.3; }
        50% { r: 15; opacity: 0.1; }
        100% { r: 8; opacity: 0.3; }
      }
      .pulse-ring { animation: pulse 2s ease-in-out infinite; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [dimensions, selectedSupplier, facilityLocation]);

  // Transport mode icons
  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'ship':
        return '🚢';
      case 'truck':
        return '🚛';
      case 'rail':
        return '🚂';
      case 'air':
        return '✈️';
      default:
        return '📦';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full rounded-lg" />

      {/* Tooltip */}
      {tooltip && tooltip.content && (
        <div
          className="fixed z-50 px-4 py-3 bg-background-primary border border-border-subtle rounded-xl shadow-2xl pointer-events-none max-w-xs"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{getTransportIcon(tooltip.content.transportMode)}</span>
            <div>
              <div className="text-white font-semibold text-sm">{tooltip.content.name}</div>
              <div className="text-gray-400 text-xs">{tooltip.content.country}</div>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Material:</span>
              <span className="text-white">{tooltip.content.material}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Annual Volume:</span>
              <span className="text-white">{tooltip.content.annualVolume}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Distance:</span>
              <span className="text-white">{tooltip.content.distanceKm.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-1 mt-1">
              <span className="text-gray-400">Transport CO₂:</span>
              <span className="text-amber-400 font-semibold">
                {(tooltip.content.emissionsKgCO2 / 1000).toFixed(2)} t
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend & Stats */}
      <div className="flex flex-wrap justify-between items-start gap-4 mt-4 text-xs">
        {/* Emissions gradient legend */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400">Transport Emissions:</span>
          <div className="flex items-center gap-1">
            <span className="text-blue-400">Low</span>
            <div
              className="w-24 h-2 rounded"
              style={{
                background: 'linear-gradient(to right, #3B82F6, #EF4444)',
              }}
            />
            <span className="text-red-400">High</span>
          </div>
        </div>

        {/* Transport mode legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span>🚢</span>
            <span className="text-gray-400">Ocean</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🚛</span>
            <span className="text-gray-400">Road</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🚂</span>
            <span className="text-gray-400">Rail</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✈️</span>
            <span className="text-gray-400">Air</span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-amber-400 font-bold">{(totalEmissions / 1000).toFixed(1)}t</div>
            <div className="text-gray-500">Total CO₂</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-bold">{(totalDistance / 1000).toFixed(0)}k km</div>
            <div className="text-gray-500">Total Distance</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-bold">{SUPPLY_CHAIN_DATA.length}</div>
            <div className="text-gray-500">Suppliers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
