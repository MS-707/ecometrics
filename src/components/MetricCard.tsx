'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'amber' | 'red';
}

const colorClasses = {
  purple: {
    bg: 'bg-accent-purple-glow',
    text: 'text-accent-purple',
  },
  green: {
    bg: 'bg-accent-green-glow',
    text: 'text-accent-green',
  },
  blue: {
    bg: 'bg-accent-blue-glow',
    text: 'text-accent-blue',
  },
  amber: {
    bg: 'bg-accent-amber-glow',
    text: 'text-accent-amber',
  },
  red: {
    bg: 'bg-accent-red-glow',
    text: 'text-accent-red',
  },
};

export default function MetricCard({
  title,
  value,
  unit,
  change,
  changeLabel = 'vs last period',
  icon,
  color,
}: MetricCardProps) {
  const colors = colorClasses[color];

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus size={14} />;
    // For most metrics, down is good (less consumption)
    return change < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-400';
    // Down is typically good for environmental metrics
    return change < 0 ? 'text-accent-green' : 'text-accent-red';
  };

  return (
    <div className="bg-background-card rounded-xl border border-border-subtle p-5 transition-all duration-200 hover:border-border-subtle/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-default">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
          <div className={colors.text}>{icon}</div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {value}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </div>
      <div className="text-sm text-gray-400">{title}</div>
      {change !== undefined && (
        <div className="text-xs text-gray-500 mt-1">{changeLabel}</div>
      )}
    </div>
  );
}
