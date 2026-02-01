'use client';

import { useState, useEffect } from 'react';
import { Leaf, Settings, RefreshCw, FileText, Download } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import { getSettings, generateSampleData, getMonthlyData } from '@/lib/storage';
import { formatQuarter, getCurrentQuarter } from '@/lib/calculations';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [facilityName, setFacilityName] = useState('');
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    setFacilityName(getSettings().facilityName);
    setHasData(getMonthlyData().length > 0);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const handleLoadSampleData = () => {
    if (confirm('This will add 12 months of sample data for demonstration. Continue?')) {
      generateSampleData();
      handleRefresh();
    }
  };

  const currentQ = getCurrentQuarter();

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="bg-background-secondary border-b border-border-subtle sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-green to-emerald-500 flex items-center justify-center">
                <Leaf size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">EcoMetrics</h1>
                <p className="text-xs text-gray-500">{facilityName} • {formatQuarter(currentQ)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/review"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                <FileText size={16} />
                Report
              </a>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <a
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-purple text-white hover:bg-accent-purple-hover transition-colors"
              >
                <Settings size={16} />
                Admin
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Dashboard key={refreshKey} />

        {/* Quick Actions for Empty State */}
        {!hasData && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLoadSampleData}
              className="flex items-center gap-2 px-4 py-2 border border-border-subtle text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition-colors"
            >
              <Download size={16} />
              Load Sample Data (Demo)
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-10 py-5 bg-background-secondary">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-gray-500">
          <span>EcoMetrics v1.0 — Environmental Performance Tracking for ISO 14001</span>
          <span>Carbon factors: EPA GHG Emission Factors Hub 2024</span>
        </div>
      </footer>
    </div>
  );
}
