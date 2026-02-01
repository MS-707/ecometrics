'use client';

import { useState, useEffect } from 'react';
import { Leaf, Printer, ArrowLeft, TrendingDown, TrendingUp, Minus, CheckCircle, AlertCircle } from 'lucide-react';
import { MonthlyData, Objective } from '@/lib/types';
import { getMonthlyData, getObjectives, getSettings } from '@/lib/storage';
import {
  calculateEmissions,
  calculateIntensity,
  aggregateMonthlyData,
  filterByQuarter,
  getCurrentQuarter,
  getPreviousQuarter,
  formatQuarter,
  formatNumber,
  kgToMetricTons,
  percentChange,
  MONTH_NAMES,
} from '@/lib/calculations';

export default function ManagementReviewPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [facilityName, setFacilityName] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());

  useEffect(() => {
    setMonthlyData(getMonthlyData());
    setObjectives(getObjectives());
    setFacilityName(getSettings().facilityName);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const currentQ = selectedQuarter;
  const previousQ = getPreviousQuarter(currentQ);

  const currentQData = filterByQuarter(monthlyData, currentQ.year, currentQ.quarter);
  const previousQData = filterByQuarter(monthlyData, previousQ.year, previousQ.quarter);

  const currentAgg = aggregateMonthlyData(currentQData);
  const previousAgg = aggregateMonthlyData(previousQData);

  const currentEmissions = currentAgg ? calculateEmissions(currentAgg) : null;
  const previousEmissions = previousAgg ? calculateEmissions(previousAgg) : null;

  const currentIntensity = currentAgg ? calculateIntensity(currentAgg) : null;
  const previousIntensity = previousAgg ? calculateIntensity(previousAgg) : null;

  const renderTrend = (current: number, previous: number, invertColors = true) => {
    const change = percentChange(current, previous);
    if (Math.abs(change) < 0.5) {
      return <span className="text-gray-500 flex items-center gap-1"><Minus size={14} /> No change</span>;
    }
    const isGood = invertColors ? change < 0 : change > 0;
    return (
      <span className={`flex items-center gap-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {change < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  const quarters = [];
  const now = getCurrentQuarter();
  for (let i = 0; i < 8; i++) {
    let q = now.quarter - i;
    let y = now.year;
    while (q <= 0) {
      q += 4;
      y -= 1;
    }
    quarters.push({ year: y, quarter: q });
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-background-primary border-b border-border-subtle print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-green to-emerald-500 flex items-center justify-center">
                <Leaf size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Management Review Report</h1>
                <p className="text-xs text-gray-500">Printable summary for quarterly reviews</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={`${selectedQuarter.year}-${selectedQuarter.quarter}`}
                onChange={e => {
                  const [y, q] = e.target.value.split('-').map(Number);
                  setSelectedQuarter({ year: y, quarter: q });
                }}
                className="px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white text-sm"
              >
                {quarters.map(q => (
                  <option key={`${q.year}-${q.quarter}`} value={`${q.year}-${q.quarter}`}>
                    {formatQuarter(q)}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors"
              >
                <Printer size={16} />
                Print Report
              </button>
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 border border-border-subtle text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition-colors"
              >
                <ArrowLeft size={16} />
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0">
        <div className="mb-8 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Environmental Performance Report</h1>
              <p className="text-gray-600 mt-1">{facilityName} — {formatQuarter(currentQ)}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Report Generated: {new Date().toLocaleDateString()}</p>
              <p>ISO 14001 Management Review</p>
            </div>
          </div>
        </div>

        {currentAgg ? (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Executive Summary
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Total Carbon Footprint</h3>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatNumber(kgToMetricTons(currentEmissions!.total), 2)} <span className="text-lg font-normal">metric tons CO₂e</span>
                  </div>
                  {previousEmissions && (
                    <div className="mt-2 text-sm">
                      vs {formatQuarter(previousQ)}: {renderTrend(currentEmissions!.total, previousEmissions.total)}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Reporting Period Data</h3>
                  <p className="text-sm text-gray-600">
                    <strong>Months covered:</strong> {currentQData.length} of 3
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Average headcount:</strong> {currentAgg.employeeCount}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Facility size:</strong> {formatNumber(currentAgg.squareFeet)} sq ft
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Utility Consumption
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-medium">Resource</th>
                    <th className="text-right py-2 text-gray-600 font-medium">{formatQuarter(currentQ)}</th>
                    <th className="text-right py-2 text-gray-600 font-medium">{formatQuarter(previousQ)}</th>
                    <th className="text-right py-2 text-gray-600 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Electricity</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentAgg.electricityKwh)} kWh</td>
                    <td className="py-3 text-right text-gray-500">{previousAgg ? formatNumber(previousAgg.electricityKwh) : '—'} kWh</td>
                    <td className="py-3 text-right">{previousAgg ? renderTrend(currentAgg.electricityKwh, previousAgg.electricityKwh) : '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Natural Gas</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentAgg.naturalGasTherm)} therms</td>
                    <td className="py-3 text-right text-gray-500">{previousAgg ? formatNumber(previousAgg.naturalGasTherm) : '—'} therms</td>
                    <td className="py-3 text-right">{previousAgg ? renderTrend(currentAgg.naturalGasTherm, previousAgg.naturalGasTherm) : '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Water</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentAgg.waterGallons)} gallons</td>
                    <td className="py-3 text-right text-gray-500">{previousAgg ? formatNumber(previousAgg.waterGallons) : '—'} gallons</td>
                    <td className="py-3 text-right">{previousAgg ? renderTrend(currentAgg.waterGallons, previousAgg.waterGallons) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Greenhouse Gas Emissions
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-medium">Scope</th>
                    <th className="text-left py-2 text-gray-600 font-medium">Source</th>
                    <th className="text-right py-2 text-gray-600 font-medium">kg CO₂e</th>
                    <th className="text-right py-2 text-gray-600 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Scope 1</td>
                    <td className="py-3 text-gray-600">Natural Gas (Direct)</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentEmissions!.scope1, 0)}</td>
                    <td className="py-3 text-right text-gray-500">{((currentEmissions!.scope1 / currentEmissions!.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Scope 2</td>
                    <td className="py-3 text-gray-600">Electricity (Indirect)</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentEmissions!.scope2, 0)}</td>
                    <td className="py-3 text-right text-gray-500">{((currentEmissions!.scope2 / currentEmissions!.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">Scope 3</td>
                    <td className="py-3 text-gray-600">Transportation</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentEmissions!.scope3, 0)}</td>
                    <td className="py-3 text-right text-gray-500">{((currentEmissions!.scope3 / currentEmissions!.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="py-3 text-gray-900" colSpan={2}>Total</td>
                    <td className="py-3 text-right text-gray-900">{formatNumber(currentEmissions!.total, 0)}</td>
                    <td className="py-3 text-right text-gray-900">100%</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">
                * Emission factors based on EPA GHG Emission Factors Hub (2024)
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Intensity Metrics
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(currentIntensity!.electricityPerEmployee, 0)}
                  </div>
                  <div className="text-sm text-gray-600">kWh per employee</div>
                  {previousIntensity && (
                    <div className="text-xs mt-1">
                      {renderTrend(currentIntensity!.electricityPerEmployee, previousIntensity.electricityPerEmployee)}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(currentIntensity!.waterPerEmployee, 0)}
                  </div>
                  <div className="text-sm text-gray-600">gallons per employee</div>
                  {previousIntensity && (
                    <div className="text-xs mt-1">
                      {renderTrend(currentIntensity!.waterPerEmployee, previousIntensity.waterPerEmployee)}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(currentIntensity!.carbonPerEmployee, 0)}
                  </div>
                  <div className="text-sm text-gray-600">kg CO₂ per employee</div>
                  {previousIntensity && (
                    <div className="text-xs mt-1">
                      {renderTrend(currentIntensity!.carbonPerEmployee, previousIntensity.carbonPerEmployee)}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {objectives.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Environmental Objectives Status
                </h2>
                <div className="space-y-3">
                  {objectives.map(obj => (
                    <div key={obj.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {obj.status === 'on-track' || obj.status === 'achieved' ? (
                        <CheckCircle size={20} className="text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle size={20} className="text-amber-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{obj.name}</div>
                        <div className="text-sm text-gray-600">{obj.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Target: {obj.targetValue}{obj.targetType === 'reduction' ? '% reduction' : ''} by Q{obj.targetQuarter} {obj.targetYear}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        obj.status === 'on-track' ? 'bg-green-100 text-green-700' :
                        obj.status === 'achieved' ? 'bg-purple-100 text-purple-700' :
                        obj.status === 'at-risk' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {obj.status.replace('-', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <footer className="pt-6 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>EcoMetrics Environmental Performance Tracking</span>
                <span>Page 1 of 1</span>
              </div>
            </footer>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No data available for {formatQuarter(currentQ)}</p>
            <p className="text-sm mt-2">Enter monthly data in the admin panel to generate reports.</p>
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
