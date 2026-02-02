'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { geoOrthographic, geoPath, geoGraticule, geoInterpolate } from 'd3-geo';

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
  emissionFactor: number;
}

interface SupplyChainMapProps {
  width?: number;
  height?: number;
  facilityLocation?: { lat: number; lng: number; name: string };
}

// Sample supply chain data
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
    emissionFactor: 0.004,
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
    emissionFactor: 0.05,
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
    emissionFactor: 0.03,
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
    emissionFactor: 0.5,
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

// Versor math for smooth globe rotation
const versor = {
  cartesian(e: [number, number]): [number, number, number] {
    const l = e[0] * Math.PI / 180;
    const p = e[1] * Math.PI / 180;
    const cp = Math.cos(p);
    return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
  },
  rotation(v0: [number, number, number], v1: [number, number, number]): [number, number, number, number] {
    const c = this.cross(v0, v1);
    const d = this.dot(v0, v1);
    return d < 0
      ? [Math.sqrt((1 - d) / 2), c[0] / Math.sqrt(2 * (1 - d)), c[1] / Math.sqrt(2 * (1 - d)), c[2] / Math.sqrt(2 * (1 - d))]
      : [Math.sqrt((1 + d) / 2), c[0] / Math.sqrt(2 * (1 + d)), c[1] / Math.sqrt(2 * (1 + d)), c[2] / Math.sqrt(2 * (1 + d))];
  },
  dot(v0: [number, number, number], v1: [number, number, number]): number {
    return v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
  },
  cross(v0: [number, number, number], v1: [number, number, number]): [number, number, number] {
    return [
      v0[1] * v1[2] - v0[2] * v1[1],
      v0[2] * v1[0] - v0[0] * v1[2],
      v0[0] * v1[1] - v0[1] * v1[0],
    ];
  },
  multiply(q0: [number, number, number, number], q1: [number, number, number, number]): [number, number, number, number] {
    return [
      q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2] - q0[3] * q1[3],
      q0[0] * q1[1] + q0[1] * q1[0] + q0[2] * q1[3] - q0[3] * q1[2],
      q0[0] * q1[2] - q0[1] * q1[3] + q0[2] * q1[0] + q0[3] * q1[1],
      q0[0] * q1[3] + q0[1] * q1[2] - q0[2] * q1[1] + q0[3] * q1[0],
    ];
  },
  toEuler(q: [number, number, number, number]): [number, number, number] {
    return [
      Math.atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * 180 / Math.PI,
      Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * 180 / Math.PI,
      Math.atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * 180 / Math.PI,
    ];
  },
};

export default function SupplyChainMap({
  facilityLocation = { lat: 39.8283, lng: -98.5795, name: 'US Facility' },
}: SupplyChainMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: SupplyChainNode | null;
  } | null>(null);
  const [rotation, setRotation] = useState<[number, number, number]>([-facilityLocation.lng, -facilityLocation.lat, 0]);
  const particleProgressRef = useRef<number[]>(SUPPLY_CHAIN_DATA.map(() => Math.random()));
  const animationRef = useRef<number | undefined>(undefined);

  const totalEmissions = SUPPLY_CHAIN_DATA.reduce((sum, s) => sum + s.emissionsKgCO2, 0);
  const totalDistance = SUPPLY_CHAIN_DATA.reduce((sum, s) => sum + s.distanceKm, 0);

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        const size = Math.min(containerWidth, 600);
        setDimensions({
          width: size,
          height: size,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Color scale for emissions
  const getRouteColor = useCallback((emissions: number) => {
    const maxEmissions = Math.max(...SUPPLY_CHAIN_DATA.map((d) => d.emissionsKgCO2));
    const t = emissions / maxEmissions;
    const r = Math.round(59 + t * (239 - 59));
    const g = Math.round(130 + t * (68 - 130));
    const b = Math.round(246 + t * (68 - 246));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }, []);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const scale = Math.min(width, height) / 2.2;

    // Create projection
    const projection = geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90);

    const path = geoPath(projection, ctx);
    const graticule = geoGraticule().step([15, 15]);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw ocean background
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#0c1222';
    ctx.fill();

    // Draw graticule
    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Draw sphere outline
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw land masses (simplified)
    const land = {
      type: 'MultiPolygon' as const,
      coordinates: [
        // North America
        [[[-170, 70], [-60, 70], [-60, 25], [-80, 25], [-125, 30], [-170, 55], [-170, 70]]],
        // South America
        [[[-80, 10], [-35, 5], [-35, -55], [-75, -55], [-80, -5], [-80, 10]]],
        // Europe
        [[[-10, 70], [40, 70], [40, 35], [-10, 35], [-10, 70]]],
        // Africa
        [[[-20, 35], [50, 35], [50, -35], [15, -35], [-20, 5], [-20, 35]]],
        // Asia
        [[[40, 70], [180, 70], [180, 10], [100, -10], [60, 25], [40, 35], [40, 70]]],
        // Australia
        [[[110, -10], [155, -10], [155, -45], [110, -45], [110, -10]]],
      ],
    };

    ctx.beginPath();
    path(land);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw supply routes as great circle arcs
    SUPPLY_CHAIN_DATA.forEach((supplier, index) => {
      const source: [number, number] = [supplier.lng, supplier.lat];
      const target: [number, number] = [facilityLocation.lng, facilityLocation.lat];

      // Check if route is visible
      const sourceVisible = projection(source);
      const targetVisible = projection(target);

      // Draw arc
      const interpolate = geoInterpolate(source, target);
      const arcPoints: [number, number][] = [];
      for (let t = 0; t <= 1; t += 0.02) {
        arcPoints.push(interpolate(t) as [number, number]);
      }

      // Draw the arc segments
      ctx.beginPath();
      let started = false;
      arcPoints.forEach((point, i) => {
        const projected = projection(point);
        if (projected) {
          if (!started) {
            ctx.moveTo(projected[0], projected[1]);
            started = true;
          } else {
            ctx.lineTo(projected[0], projected[1]);
          }
        } else if (started) {
          // Break the path if point goes behind globe
          ctx.stroke();
          ctx.beginPath();
          started = false;
        }
      });
      ctx.strokeStyle = getRouteColor(supplier.emissionsKgCO2);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw animated particle
      const progress = particleProgressRef.current[index];
      const particlePos = interpolate(progress);
      const projectedParticle = projection(particlePos as [number, number]);

      if (projectedParticle) {
        ctx.beginPath();
        ctx.arc(projectedParticle[0], projectedParticle[1], 4, 0, 2 * Math.PI);
        ctx.fillStyle = getRouteColor(supplier.emissionsKgCO2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw supplier marker
      if (sourceVisible) {
        ctx.beginPath();
        ctx.arc(sourceVisible[0], sourceVisible[1], 6, 0, 2 * Math.PI);
        ctx.fillStyle = getRouteColor(supplier.emissionsKgCO2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw facility marker
    const facilityPos = projection([facilityLocation.lng, facilityLocation.lat]);
    if (facilityPos) {
      // Outer glow
      ctx.beginPath();
      ctx.arc(facilityPos[0], facilityPos[1], 12, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.fill();

      // Inner marker
      ctx.beginPath();
      ctx.arc(facilityPos[0], facilityPos[1], 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = '#10B981';
      ctx.textAlign = 'center';
      ctx.fillText('YOUR FACILITY', facilityPos[0], facilityPos[1] - 18);
    }

    // Update particle positions
    particleProgressRef.current = particleProgressRef.current.map((p) => {
      const newP = p + 0.003;
      return newP > 1 ? 0 : newP;
    });

  }, [dimensions, rotation, facilityLocation, getRouteColor]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      render();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  // Drag handling with versor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = dimensions;
    const scale = Math.min(width, height) / 2.2;

    let v0: [number, number, number] | null = null;
    let r0: [number, number, number] | null = null;
    let q0: [number, number, number, number] | null = null;

    const projection = geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90);

    const invert = (pos: [number, number]): [number, number] | null => {
      const inverted = projection.invert?.(pos);
      return inverted || null;
    };

    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const pos = invert([x, y]);

      if (pos) {
        v0 = versor.cartesian(pos);
        r0 = rotation;
        q0 = [1, 0, 0, 0];
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!v0 || !r0 || !q0) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update projection with current rotation for accurate inversion
      const currentProjection = geoOrthographic()
        .scale(scale)
        .translate([width / 2, height / 2])
        .rotate(r0)
        .clipAngle(90);

      const pos = currentProjection.invert?.([x, y]);
      if (pos) {
        const v1 = versor.cartesian(pos);
        const q1 = versor.rotation(v0, v1);
        const q = versor.multiply(q0, q1);
        const euler = versor.toEuler(q);

        setRotation([
          r0[0] + euler[0],
          r0[1] + euler[1],
          r0[2] + euler[2],
        ]);
      }
    };

    const handleMouseUp = () => {
      v0 = null;
      r0 = null;
      q0 = null;
    };

    // Check if mouse is over a supplier
    const handleHover = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const projection = geoOrthographic()
        .scale(scale)
        .translate([width / 2, height / 2])
        .rotate(rotation)
        .clipAngle(90);

      let found: SupplyChainNode | null = null;

      for (const supplier of SUPPLY_CHAIN_DATA) {
        const pos = projection([supplier.lng, supplier.lat]);
        if (pos) {
          const dist = Math.sqrt((pos[0] - x) ** 2 + (pos[1] - y) ** 2);
          if (dist < 12) {
            found = supplier;
            break;
          }
        }
      }

      if (found) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: found,
        });
        canvas.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        canvas.style.cursor = 'grab';
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousemove', handleHover);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousemove', handleHover);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [dimensions, rotation]);

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'ship': return '🚢';
      case 'truck': return '🚛';
      case 'rail': return '🚂';
      case 'air': return '✈️';
      default: return '📦';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-xl cursor-grab"
        style={{ touchAction: 'none' }}
      />

      {/* Drag hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs text-gray-300 pointer-events-none">
        🌍 Drag to rotate globe
      </div>

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
      <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-xs w-full">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">Emissions:</span>
          <div className="flex items-center gap-1">
            <span className="text-blue-400">Low</span>
            <div
              className="w-16 h-2 rounded"
              style={{ background: 'linear-gradient(to right, #3B82F6, #EF4444)' }}
            />
            <span className="text-red-400">High</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span>🚢</span><span className="text-gray-400">Ocean</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🚛</span><span className="text-gray-400">Road</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🚂</span><span className="text-gray-400">Rail</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✈️</span><span className="text-gray-400">Air</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-amber-400 font-bold">{(totalEmissions / 1000).toFixed(1)}t</div>
            <div className="text-gray-500">Total CO₂</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-bold">{(totalDistance / 1000).toFixed(0)}k km</div>
            <div className="text-gray-500">Distance</div>
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
