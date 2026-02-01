'use client';

import { useState, useEffect } from 'react';
import { Save, Calendar, Zap, Droplets, Flame, Truck, Users, Square, Trash2 } from 'lucide-react';
import { MonthlyData } from '@/lib/types';
import { getMonthData, saveMonthlyData, deleteMonthlyData, getSettings } from '@/lib/storage';
import { MONTH_NAMES, calculateEmissions, formatNumber, kgToMetricTons } from '@/lib/calculations';

interface DataEntryFormProps {
  onSave?: () => void;
}

export default function DataEntryForm({ onSave }: DataEntryFormProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const settings = getSettings();

  const [formData, setFormData] = useState<Partial<MonthlyData>>({
    electricityKwh: 0,
    naturalGasTherm: 0,
    waterGallons: 0,
    inboundDeliveryMiles: 0,
    outboundShippingMiles: 0,
    employeeCount: settings.defaultEmployeeCount,
    squareFeet: settings.defaultSquareFeet,
    notes: '',
  });

  useEffect(() => {
    const existing = getMonthData(year, month);
    if (existing) {
      setFormData(existing);
      setIsNew(false);
    } else {
      setFormData({
        electricityKwh: 0,
        naturalGasTherm: 0,
        waterGallons: 0,
        inboundDeliveryMiles: 0,
        outboundShippingMiles: 0,
        employeeCount: settings.defaultEmployeeCount,
        squareFeet: settings.defaultSquareFeet,
        notes: '',
      });
      setIsNew(true);
    }
    setShowPreview(false);
  }, [year, month, settings.defaultEmployeeCount, settings.defaultSquareFeet]);

  const handleChange = (field: keyof MonthlyData, value: number | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setShowPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data: MonthlyData = {
      id: `${year}-${month}`,
      year,
      month,
      electricityKwh: formData.electricityKwh || 0,
      naturalGasTherm: formData.naturalGasTherm || 0,
      waterGallons: formData.waterGallons || 0,
      inboundDeliveryMiles: formData.inboundDeliveryMiles || 0,
      outboundShippingMiles: formData.outboundShippingMiles || 0,
      employeeCount: formData.employeeCount || 1,
      squareFeet: formData.squareFeet || 1,
      notes: formData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveMonthlyData(data);

    setTimeout(() => {
      setSaving(false);
      setIsNew(false);
      onSave?.();
    }, 300);
  };

  const handleDelete = () => {
    if (confirm(`Delete data for ${MONTH_NAMES[month - 1]} ${year}?`)) {
      deleteMonthlyData(year, month);
      setFormData({
        electricityKwh: 0,
        naturalGasTherm: 0,
        waterGallons: 0,
        inboundDeliveryMiles: 0,
        outboundShippingMiles: 0,
        employeeCount: settings.defaultEmployeeCount,
        squareFeet: settings.defaultSquareFeet,
        notes: '',
      });
      setIsNew(true);
      setShowPreview(false);
      onSave?.();
    }
  };

  const previewEmissions = showPreview
    ? calculateEmissions({
        ...formData,
        id: 'preview',
        year,
        month,
        electricityKwh: formData.electricityKwh || 0,
        naturalGasTherm: formData.naturalGasTherm || 0,
        waterGallons: formData.waterGallons || 0,
        inboundDeliveryMiles: formData.inboundDeliveryMiles || 0,
        outboundShippingMiles: formData.outboundShippingMiles || 0,
        employeeCount: formData.employeeCount || 1,
        squareFeet: formData.squareFeet || 1,
        createdAt: '',
        updatedAt: '',
      } as MonthlyData)
    : null;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-background-secondary rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={18} className="text-accent-purple" />
          <h3 className="font-semibold text-white">Select Period</h3>
          {!isNew && (
            <span className="ml-auto text-xs px-2 py-1 bg-accent-purple-glow text-accent-purple rounded">
              Editing existing
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4">
        <h3 className="font-semibold text-white mb-4">Utility Consumption</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Zap size={14} className="text-accent-blue" />
              Electricity (kWh)
            </label>
            <input
              type="number"
              value={formData.electricityKwh || ''}
              onChange={e => handleChange('electricityKwh', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Flame size={14} className="text-accent-amber" />
              Natural Gas (therms)
            </label>
            <input
              type="number"
              value={formData.naturalGasTherm || ''}
              onChange={e => handleChange('naturalGasTherm', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Droplets size={14} className="text-cyan-400" />
              Water (gallons)
            </label>
            <input
              type="number"
              value={formData.waterGallons || ''}
              onChange={e => handleChange('waterGallons', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4">
        <h3 className="font-semibold text-white mb-1">Transportation (Scope 3)</h3>
        <p className="text-sm text-gray-500 mb-4">Estimate delivery and shipping miles for the month</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Truck size={14} className="text-accent-purple" />
              Inbound Delivery Miles
            </label>
            <input
              type="number"
              value={formData.inboundDeliveryMiles || ''}
              onChange={e => handleChange('inboundDeliveryMiles', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">Parts/materials delivered to your facility</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Truck size={14} className="text-accent-purple" />
              Outbound Shipping Miles
            </label>
            <input
              type="number"
              value={formData.outboundShippingMiles || ''}
              onChange={e => handleChange('outboundShippingMiles', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">Parts shipped to customer sites</p>
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4">
        <h3 className="font-semibold text-white mb-4">Facility Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Users size={14} />
              Employee Count
            </label>
            <input
              type="number"
              value={formData.employeeCount || ''}
              onChange={e => handleChange('employeeCount', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Square size={14} />
              Square Feet
            </label>
            <input
              type="number"
              value={formData.squareFeet || ''}
              onChange={e => handleChange('squareFeet', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4">
        <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
        <textarea
          value={formData.notes || ''}
          onChange={e => handleChange('notes', e.target.value)}
          placeholder="Any relevant notes for this period..."
          rows={2}
          className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors resize-none"
        />
      </div>

      {showPreview && previewEmissions && (
        <div className="bg-accent-green-glow border border-accent-green/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-accent-green mb-2">Calculated Emissions Preview</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white font-medium">
                {formatNumber(previewEmissions.scope1, 0)} kg
              </div>
              <div className="text-gray-400">Scope 1 (Gas)</div>
            </div>
            <div>
              <div className="text-white font-medium">
                {formatNumber(previewEmissions.scope2, 0)} kg
              </div>
              <div className="text-gray-400">Scope 2 (Elec)</div>
            </div>
            <div>
              <div className="text-white font-medium">
                {formatNumber(previewEmissions.scope3, 0)} kg
              </div>
              <div className="text-gray-400">Scope 3 (Trans)</div>
            </div>
            <div>
              <div className="text-accent-green font-bold">
                {formatNumber(kgToMetricTons(previewEmissions.total), 2)} t
              </div>
              <div className="text-gray-400">Total CO₂</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : isNew ? 'Save Data' : 'Update Data'}
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 border border-accent-red text-accent-red rounded-lg hover:bg-accent-red-glow transition-colors"
          >
            <Trash2 size={18} />
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
