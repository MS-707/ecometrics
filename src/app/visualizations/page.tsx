'use client';

import { useState, useEffect } from 'react';
import { Leaf, FlaskConical, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import EmissionsSankey from '@/components/EmissionsSankey';
import { getMonthlyData, getSettings } from '@/lib/storage';
import { calculateEmissions, aggregateMonthlyData, filterByQuarter, getCurrentQuarter, formatQuarter } from '@/lib/calculations';
import { MonthlyData } from '@/lib/types';

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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-border-subtle" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-fuchsia-500 flex items-center justify-center">
                  <FlaskConical size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Experimental Visualizations</h1>
                  <p className="text-xs text-gray-500">D3.js-powered sustainability insights</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/30 rounded-full">
              <Sparkles size={14} className="text-accent-purple" />
              <span className="text-xs text-accent-purple font-medium">Preview</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-accent-purple/10 via-fuchsia-500/10 to-accent-blue/10 rounded-2xl border border-accent-purple/20 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={24} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Welcome to the Visualization Lab</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                These experimental D3.js visualizations bring your sustainability data to life with
                animated flows, interactive drill-downs, and novel ways to understand environmental impact.
                Watch how energy transforms into emissions in real-time.
              </p>
            </div>
          </div>
        </div>

        {!currentAgg || !emissions ? (
          <div className="bg-background-card rounded-xl border border-border-subtle p-12 text-center">
            <Leaf size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
            <p className="text-gray-400 mb-6">
              Add some monthly data in the admin panel to see the visualizations come alive.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors"
            >
              Add Data
            </Link>
          </div>
        ) : (
          <>
            {/* Carbon Flow Sankey */}
            <section className="bg-background-card rounded-xl border border-border-subtle overflow-hidden">
              <div className="p-6 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                      Carbon Flow Diagram
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Watch energy inputs transform into emissions ({formatQuarter(currentQ)})
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-background-secondary rounded-lg border border-border-subtle hover:border-accent-purple/30 transition-all"
                  >
                    <RefreshCw size={14} />
                    Replay Animation
                  </button>
                </div>
              </div>
              <div className="p-6">
                <EmissionsSankey
                  electricity={currentAgg.electricityKwh}
                  naturalGas={currentAgg.naturalGasTherm}
                  transportMiles={currentAgg.inboundDeliveryMiles + currentAgg.outboundShippingMiles}
                  scope1={emissions.scope1}
                  scope2={emissions.scope2}
                  scope3={emissions.scope3}
                />
              </div>
              <div className="px-6 py-4 bg-background-secondary/50 border-t border-border-subtle">
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-400">How to read:</strong> Energy sources on the left flow through
                  your facility and emerge as carbon emissions on the right, categorized by GHG Protocol scopes.
                  Wider flows indicate larger emission contributions. Animated particles show the continuous
                  nature of emissions generation.
                </p>
              </div>
            </section>

            {/* Emission Factors Reference */}
            <section className="bg-background-card rounded-xl border border-border-subtle p-6">
              <h3 className="text-lg font-semibold text-white mb-4">EPA Emission Factors Applied</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background-secondary rounded-lg p-4">
                  <div className="text-2xl font-bold text-accent-blue">0.417</div>
                  <div className="text-sm text-gray-400 mt-1">kg CO2 per kWh</div>
                  <div className="text-xs text-gray-500 mt-2">Scope 2 - Electricity (eGRID 2024)</div>
                </div>
                <div className="bg-background-secondary rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-400">5.3</div>
                  <div className="text-sm text-gray-400 mt-1">kg CO2 per therm</div>
                  <div className="text-xs text-gray-500 mt-2">Scope 1 - Natural Gas Combustion</div>
                </div>
                <div className="bg-background-secondary rounded-lg p-4">
                  <div className="text-2xl font-bold text-accent-purple">0.161</div>
                  <div className="text-sm text-gray-400 mt-1">kg CO2 per mile</div>
                  <div className="text-xs text-gray-500 mt-2">Scope 3 - Medium Truck Transport</div>
                </div>
              </div>
            </section>

            {/* Coming Soon Teaser */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-background-card rounded-xl border border-border-subtle border-dashed p-6 opacity-60">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
                    <span className="text-xl">📅</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Climate Calendar</h4>
                    <span className="text-xs text-accent-purple">Coming Soon</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Year-view heatmap showing daily consumption patterns and seasonal trends.
                </p>
              </div>
              <div className="bg-background-card rounded-xl border border-border-subtle border-dashed p-6 opacity-60">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
                    <span className="text-xl">🌀</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Emissions Sunburst</h4>
                    <span className="text-xs text-accent-purple">Coming Soon</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Interactive drill-down from total emissions to individual sources.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-12 py-6 bg-background-secondary/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-accent-purple to-fuchsia-500 flex items-center justify-center">
              <FlaskConical size={12} className="text-white" />
            </div>
            <span>EcoMetrics Visualization Lab - Experimental D3.js Features</span>
          </div>
          <span className="text-gray-600">Powered by D3.js - Mike Bostock, 2011</span>
        </div>
      </footer>
    </div>
  );
}
