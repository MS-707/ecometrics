'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Flame,
  Truck,
  Leaf,
  Users,
  Square,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import MetricCard from './MetricCard';
import { MonthlyData, Objective, EmissionsData, IntensityMetrics } from '@/lib/types';
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
  getQuarter,
} from '@/lib/calculations';

const COLORS = {
  electricity: '#3B82F6',
  gas: '#F59E0B',
  water: '#06B6D4',
  scope1: '#F59E0B',
  scope2: '#3B82F6',
  scope3: '#8B5CF6',
  carbon: '#10B981',
};

export default function Dashboard() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMonthlyData(getMonthlyData());
    setObjectives(getObjectives());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-purple"></div>
      </div>
    );
  }

  const currentQ = getCurrentQuarter();
  const previousQ = getPreviousQuarter(currentQ);
  const currentQData = filterByQuarter(monthlyData, currentQ.year, currentQ.quarter);
  const previousQData = filterByQuarter(monthlyData, previousQ.year, previousQ.quarter);

  const currentAgg = aggregateMonthlyData(currentQData);
  const previousAgg = aggregateMonthlyData(previousQData);

  const currentEmissions = currentAgg ? calculateEmissions(currentAgg) : null;
  const previousEmissions = previousAgg ? calculateEmissions(previousAgg) : null;

  const currentIntensity = currentAgg ? calculateIntensity(currentAgg) : null;

  const last12Months = monthlyData
    .slice(0, 12)
    .reverse()
    .map(d => ({
      name: MONTH_NAMES[d.month - 1].substring(0, 3),
      electricity: d.electricityKwh,
      gas: d.naturalGasTherm,
      water: d.waterGallons / 1000,
      ...calculateEmissions(d),
    }));

  const emissionsBreakdown = currentEmissions
    ? [
        { name: 'Scope 1 (Gas)', value: currentEmissions.scope1, color: COLORS.scope1 },
        { name: 'Scope 2 (Electricity)', value: currentEmissions.scope2, color: COLORS.scope2 },
        { name: 'Scope 3 (Transport)', value: currentEmissions.scope3, color: COLORS.scope3 },
      ]
    : [];

  const quarterComparison = currentAgg && previousAgg
    ? [
        {
          name: formatQuarter(previousQ),
          Electricity: previousAgg.electricityKwh,
          Gas: previousAgg.naturalGasTherm * 10,
          Water: previousAgg.waterGallons / 100,
        },
        {
          name: formatQuarter(currentQ),
          Electricity: currentAgg.electricityKwh,
          Gas: currentAgg.naturalGasTherm * 10,
          Water: currentAgg.waterGallons / 100,
        },
      ]
    : [];

  const noData = monthlyData.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Carbon Footprint"
          value={currentEmissions ? formatNumber(kgToMetricTons(currentEmissions.total), 1) : '—'}
          unit="metric tons CO₂"
          change={
            currentEmissions && previousEmissions
              ? percentChange(currentEmissions.total, previousEmissions.total)
              : undefined
          }
          changeLabel={`vs ${formatQuarter(previousQ)}`}
          icon={<Leaf size={20} />}
          color="green"
        />
        <MetricCard
          title="Electricity"
          value={currentAgg ? formatNumber(currentAgg.electricityKwh) : '—'}
          unit="kWh"
          change={
            currentAgg && previousAgg
              ? percentChange(currentAgg.electricityKwh, previousAgg.electricityKwh)
              : undefined
          }
          changeLabel={`vs ${formatQuarter(previousQ)}`}
          icon={<Zap size={20} />}
          color="blue"
        />
        <MetricCard
          title="Natural Gas"
          value={currentAgg ? formatNumber(currentAgg.naturalGasTherm) : '—'}
          unit="therms"
          change={
            currentAgg && previousAgg
              ? percentChange(currentAgg.naturalGasTherm, previousAgg.naturalGasTherm)
              : undefined
          }
          changeLabel={`vs ${formatQuarter(previousQ)}`}
          icon={<Flame size={20} />}
          color="amber"
        />
        <MetricCard
          title="Water"
          value={currentAgg ? formatNumber(currentAgg.waterGallons) : '—'}
          unit="gallons"
          change={
            currentAgg && previousAgg
              ? percentChange(currentAgg.waterGallons, previousAgg.waterGallons)
              : undefined
          }
          changeLabel={`vs ${formatQuarter(previousQ)}`}
          icon={<Droplets size={20} />}
          color="purple"
        />
      </div>

      <div className="bg-background-card rounded-xl border border-border-subtle p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target size={20} className="text-accent-purple" />
          Intensity Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
              <Zap size={12} /> <Users size={12} />
            </div>
            <div className="text-xl font-bold text-white">
              {currentIntensity ? formatNumber(currentIntensity.electricityPerEmployee, 0) : '—'}
            </div>
            <div className="text-xs text-gray-500">kWh/employee</div>
          </div>
          <div className="text-center p-3 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
              <Zap size={12} /> <Square size={12} />
            </div>
            <div className="text-xl font-bold text-white">
              {currentIntensity ? formatNumber(currentIntensity.electricityPerSqFt, 1) : '—'}
            </div>
            <div className="text-xs text-gray-500">kWh/sq ft</div>
          </div>
          <div className="text-center p-3 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
              <Droplets size={12} /> <Users size={12} />
            </div>
            <div className="text-xl font-bold text-white">
              {currentIntensity ? formatNumber(currentIntensity.waterPerEmployee, 0) : '—'}
            </div>
            <div className="text-xs text-gray-500">gal/employee</div>
          </div>
          <div className="text-center p-3 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
              <Droplets size={12} /> <Square size={12} />
            </div>
            <div className="text-xl font-bold text-white">
              {currentIntensity ? formatNumber(currentIntensity.waterPerSqFt, 1) : '—'}
            </div>
            <div className="text-xs text-gray-500">gal/sq ft</div>
          </div>
          <div className="text-center p-3 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
              <Leaf size={12} /> <Users size={12} />
            </div>
            <div className="text-xl font-bold text-white">
              {currentIntensity ? formatNumber(currentIntensity.carbonPerEmployee, 0) : '—'}
            </div>
            <div className="text-xs text-gray-500">kg CO₂/employee</div>
          </div>
          <div className="text-center p-3 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
              <Leaf size={12} /> <Square size={12} />
            </div>
            <div className="text-xl font-bold text-white">
              {currentIntensity ? formatNumber(currentIntensity.carbonPerSqFt, 2) : '—'}
            </div>
            <div className="text-xs text-gray-500">kg CO₂/sq ft</div>
          </div>
        </div>
      </div>

      {noData ? (
        <div className="bg-background-card rounded-xl border border-border-subtle p-8 text-center">
          <Leaf size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Data Yet</h3>
          <p className="text-gray-400 mb-4">
            Start tracking your environmental metrics by adding monthly data in the admin panel.
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors"
          >
            Add Data
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-background-card rounded-xl border border-border-subtle p-5">
              <h3 className="text-lg font-semibold text-white mb-4">12-Month Consumption Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={last12Months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16161F',
                      border: '1px solid #2A2A3C',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="electricity"
                    name="Electricity (kWh)"
                    stroke={COLORS.electricity}
                    strokeWidth={2}
                    dot={{ fill: COLORS.electricity, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="water"
                    name="Water (k gal)"
                    stroke={COLORS.water}
                    strokeWidth={2}
                    dot={{ fill: COLORS.water, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-background-card rounded-xl border border-border-subtle p-5">
              <h3 className="text-lg font-semibold text-white mb-4">
                Carbon Emissions by Scope ({formatQuarter(currentQ)})
              </h3>
              {emissionsBreakdown.length > 0 ? (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={250}>
                    <PieChart>
                      <Pie
                        data={emissionsBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {emissionsBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${formatNumber(value as number, 0)} kg CO₂`}
                        contentStyle={{
                          backgroundColor: '#16161F',
                          border: '1px solid #2A2A3C',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {emissionsBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <div className="text-sm text-white">{item.name}</div>
                          <div className="text-xs text-gray-400">
                            {formatNumber(item.value, 0)} kg ({((item.value / currentEmissions!.total) * 100).toFixed(0)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border-subtle">
                      <div className="text-sm font-semibold text-white">
                        Total: {formatNumber(kgToMetricTons(currentEmissions!.total), 2)} metric tons
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  No data for current quarter
                </div>
              )}
            </div>
          </div>

          {quarterComparison.length > 0 && (
            <div className="bg-background-card rounded-xl border border-border-subtle p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Quarter-over-Quarter Comparison</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={quarterComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16161F',
                      border: '1px solid #2A2A3C',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Electricity" fill={COLORS.electricity} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gas" fill={COLORS.gas} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Water" fill={COLORS.water} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">
                Note: Gas values scaled ×10, Water values scaled ÷100 for visibility
              </p>
            </div>
          )}

          {objectives.length > 0 && (
            <div className="bg-background-card rounded-xl border border-border-subtle p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target size={20} className="text-accent-purple" />
                Environmental Objectives
              </h3>
              <div className="space-y-4">
                {objectives.map(obj => (
                  <div key={obj.id} className="bg-background-secondary rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{obj.name}</h4>
                        <p className="text-sm text-gray-400">{obj.description}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          obj.status === 'on-track'
                            ? 'bg-accent-green-glow text-accent-green'
                            : obj.status === 'achieved'
                            ? 'bg-accent-purple-glow text-accent-purple'
                            : obj.status === 'at-risk'
                            ? 'bg-accent-amber-glow text-accent-amber'
                            : 'bg-accent-red-glow text-accent-red'
                        }`}
                      >
                        {obj.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>
                        Target: {obj.targetValue}
                        {obj.targetType === 'reduction' ? '% reduction' : ''} by Q{obj.targetQuarter}{' '}
                        {obj.targetYear}
                      </span>
                    </div>
                    <div className="mt-3 h-2 bg-background-primary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          obj.status === 'on-track' || obj.status === 'achieved'
                            ? 'bg-accent-green'
                            : obj.status === 'at-risk'
                            ? 'bg-accent-amber'
                            : 'bg-accent-red'
                        }`}
                        style={{ width: `${Math.min(75, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-background-card rounded-xl border border-border-subtle p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Truck size={20} className="text-accent-purple" />
              Scope 3 Transportation ({formatQuarter(currentQ)})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background-secondary rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {currentAgg ? formatNumber(currentAgg.inboundDeliveryMiles) : '—'}
                </div>
                <div className="text-sm text-gray-400">Inbound Delivery Miles</div>
              </div>
              <div className="text-center p-4 bg-background-secondary rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {currentAgg ? formatNumber(currentAgg.outboundShippingMiles) : '—'}
                </div>
                <div className="text-sm text-gray-400">Outbound Shipping Miles</div>
              </div>
              <div className="text-center p-4 bg-background-secondary rounded-lg">
                <div className="text-2xl font-bold text-accent-purple">
                  {currentEmissions ? formatNumber(currentEmissions.scope3, 0) : '—'}
                </div>
                <div className="text-sm text-gray-400">kg CO₂ from Transport</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
