'use client';

import { useState, useEffect } from 'react';
import { Leaf, FlaskConical, ArrowLeft, Sparkles, RefreshCw, ChevronDown, ChevronUp, Calendar, Sun } from 'lucide-react';
import Link from 'next/link';
import EmissionsSankey from '@/components/EmissionsSankey';
import ClimateCalendar from '@/components/ClimateCalendar';
import EmissionsSunburst from '@/components/EmissionsSunburst';
import { getMonthlyData, getSettings } from '@/lib/storage';
import { calculateEmissions, aggregateMonthlyData, filterByQuarter, getCurrentQuarter, formatQuarter } from '@/lib/calculations';
import { MonthlyData } from '@/lib/types';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  icon,
  badge,
  defaultExpanded = false,
  children,
  footer,
  actions
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="bg-background-card rounded-xl border border-border-subtle overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 border-b border-border-subtle flex items-center justify-between hover:bg-background-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge}
          {actions && isExpanded && (
            <div onClick={(e) => e.stopPropagation()}>{actions}</div>
          )}
          {isExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </button>

      <div className={isExpanded ? 'block' : 'hidden'}>
        <div className="p-4">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 bg-background-secondary/50 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}

export default function VisualizationsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMonthlyData(getMonthlyData());
    setLoading(false);
  }, []);

  // Get current quarter data
  const currentQ = getCurrentQuarter();
  const currentQData = filterByQuarter(monthlyData, currentQ.year, currentQ.quarter);
  const currentAgg = aggregateMonthlyData(currentQData);
  const emissions = currentAgg ? calculateEmissions(currentAgg) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-subtle bg-background-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm hidden sm:inline">Back</span>
              </Link>
              <div className="h-5 w-px bg-border-subtle" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-fuchsia-500 flex items-center justify-center">
                  <FlaskConical size={16} className="text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">Visualization Lab</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">D3.js-powered insights</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-accent-purple/10 border border-accent-purple/30 rounded-full">
              <Sparkles size={12} className="text-accent-purple" />
              <span className="text-xs text-accent-purple font-medium">Preview</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Compact Intro Banner */}
        <div className="bg-gradient-to-r from-accent-purple/10 via-fuchsia-500/10 to-accent-blue/10 rounded-xl border border-accent-purple/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Welcome to the Visualization Lab</h2>
              <p className="text-xs text-gray-400">
                Click on each section to expand/collapse. Drag the globe to rotate it.
              </p>
            </div>
          </div>
        </div>

        {!currentAgg || !emissions ? (
          <div className="bg-background-card rounded-xl border border-border-subtle p-8 text-center">
            <Leaf size={40} className="mx-auto text-gray-600 mb-3" />
            <h3 className="text-base font-semibold text-white mb-2">No Data Available</h3>
            <p className="text-sm text-gray-400 mb-4">
              Add some monthly data in the admin panel to see the visualizations come alive.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple text-white text-sm rounded-lg hover:bg-accent-purple-hover transition-colors"
            >
              Add Data
            </Link>
          </div>
        ) : (
          <>
            {/* Carbon Flow Sankey - Collapsible */}
            <CollapsibleSection
              title="Carbon Flow Diagram"
              subtitle={"Energy inputs to emissions (" + formatQuarter(currentQ) + ")"}
              icon={<span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />}
              defaultExpanded={true}
              actions={
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white bg-background-secondary rounded border border-border-subtle hover:border-accent-purple/30 transition-all"
                >
                  <RefreshCw size={12} />
                  Replay
                </button>
              }
              footer={
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-400">How to read:</strong> Energy sources flow through your facility
                  and emerge as emissions on the right, categorized by GHG Protocol scopes.
                </p>
              }
            >
              <EmissionsSankey
                electricity={currentAgg.electricityKwh}
                naturalGas={currentAgg.naturalGasTherm}
                transportMiles={currentAgg.inboundDeliveryMiles + currentAgg.outboundShippingMiles}
                scope1={emissions.scope1}
                scope2={emissions.scope2}
                scope3={emissions.scope3}
                height={260}
              />
            </CollapsibleSection>

            {/* Emission Factors - Compact */}
            <CollapsibleSection
              title="EPA Emission Factors"
              subtitle="Reference values used for calculations"
              icon={<div className="w-2 h-2 rounded-full bg-accent-blue" />}
              defaultExpanded={false}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background-secondary rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-accent-blue">0.417</div>
                  <div className="text-xs text-gray-400">kg CO2/kWh</div>
                  <div className="text-xs text-gray-500 mt-1">Scope 2 Electricity</div>
                </div>
                <div className="bg-background-secondary rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">5.3</div>
                  <div className="text-xs text-gray-400">kg CO2/therm</div>
                  <div className="text-xs text-gray-500 mt-1">Scope 1 Natural Gas</div>
                </div>
                <div className="bg-background-secondary rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-accent-purple">0.161</div>
                  <div className="text-xs text-gray-400">kg CO2/mile</div>
                  <div className="text-xs text-gray-500 mt-1">Scope 3 Transport</div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Climate Calendar */}
            <CollapsibleSection
              title="Climate Calendar"
              subtitle="Daily consumption patterns over time"
              icon={<Calendar size={16} className="text-accent-green" />}
              badge={
                <span className="px-2 py-0.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full">
                  Sample Data
                </span>
              }
              defaultExpanded={false}
              footer={
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-400">How to read:</strong> Each cell represents one day.
                  Darker colors indicate higher energy consumption. Hover for details.
                </p>
              }
            >
              <ClimateCalendar />
            </CollapsibleSection>

            {/* Emissions Sunburst */}
            <CollapsibleSection
              title="Emissions Sunburst"
              subtitle="Hierarchical breakdown by scope and source"
              icon={<Sun size={16} className="text-amber-400" />}
              defaultExpanded={false}
              footer={
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-400">How to interact:</strong> Click segments to zoom in.
                  Click the center to zoom back out. Hover for emission details.
                </p>
              }
            >
              <EmissionsSunburst
                scope1={emissions.scope1}
                scope2={emissions.scope2}
                scope3={emissions.scope3}
                electricity={currentAgg.electricityKwh}
                naturalGas={currentAgg.naturalGasTherm}
                transportMiles={currentAgg.inboundDeliveryMiles + currentAgg.outboundShippingMiles}
              />
            </CollapsibleSection>
          </>
        )}
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-border-subtle mt-8 py-4 bg-background-secondary/50">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-accent-purple to-fuchsia-500 flex items-center justify-center">
              <FlaskConical size={10} className="text-white" />
            </div>
            <span>EcoMetrics Visualization Lab</span>
          </div>
          <span className="text-gray-600">Powered by D3.js</span>
        </div>
      </footer>
    </div>
  );
}
