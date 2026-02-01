'use client';

import { useState, useEffect } from 'react';
import {
  Leaf,
  Lock,
  ArrowLeft,
  Database,
  Settings,
  Target,
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  FileText,
} from 'lucide-react';
import DataEntryForm from '@/components/DataEntryForm';
import { MonthlyData, Objective, AppSettings } from '@/lib/types';
import {
  verifyPassword,
  getSettings,
  updateSettings,
  getMonthlyData,
  getObjectives,
  saveObjective,
  deleteObjective,
  exportData,
  importData,
  generateSampleData,
} from '@/lib/storage';
import { formatMonthYear, MONTH_NAMES } from '@/lib/calculations';

type Tab = 'data' | 'objectives' | 'settings' | 'history';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const [refreshKey, setRefreshKey] = useState(0);

  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);

  useEffect(() => {
    if (authenticated) {
      setMonthlyData(getMonthlyData());
      setObjectives(getObjectives());
      setSettings(getSettings());
    }
  }, [authenticated, refreshKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPassword(password)) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleSaveSettings = () => {
    updateSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecometrics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const json = event.target?.result as string;
      if (importData(json)) {
        setRefreshKey(k => k + 1);
        alert('Data imported successfully!');
      } else {
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    if (confirm('This will add 12 months of sample data. Existing data will be preserved. Continue?')) {
      generateSampleData();
      setRefreshKey(k => k + 1);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Leaf size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">EcoMetrics Admin</h1>
            <p className="text-gray-400 mt-1">Enter password to access data entry</p>
          </div>

          <form onSubmit={handleLogin} className="bg-background-card rounded-xl border border-border-subtle p-6">
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-4 py-3 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
                  autoFocus
                />
              </div>
              {error && <p className="text-accent-red text-sm mt-2">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors font-medium"
            >
              Access Admin Panel
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-4">
            Default password: eco2024
          </p>

          <a
            href="/"
            className="flex items-center justify-center gap-2 text-gray-400 hover:text-white mt-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="bg-background-secondary border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-green to-emerald-500 flex items-center justify-center">
                <Leaf size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">EcoMetrics Admin</h1>
                <p className="text-xs text-gray-500">Data Entry & Settings</p>
              </div>
            </div>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              <ArrowLeft size={16} />
              View Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="bg-background-secondary border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'data', label: 'Enter Data', icon: Database },
              { id: 'history', label: 'History', icon: FileText },
              { id: 'objectives', label: 'Objectives', icon: Target },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent-purple text-accent-purple'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {activeTab === 'data' && (
          <div className="bg-background-card rounded-xl border border-border-subtle p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Monthly Data Entry</h2>
            <DataEntryForm onSave={() => setRefreshKey(k => k + 1)} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-background-card rounded-xl border border-border-subtle p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Data History</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-2 border border-border-subtle rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
                >
                  <Download size={16} />
                  Export
                </button>
                <label className="flex items-center gap-2 px-3 py-2 border border-border-subtle rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm cursor-pointer">
                  <Upload size={16} />
                  Import
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            {monthlyData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Database size={32} className="mx-auto mb-2 opacity-50" />
                <p>No data entered yet</p>
                <button
                  onClick={handleLoadSample}
                  className="mt-4 text-accent-purple hover:underline text-sm"
                >
                  Load sample data for demo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-border-subtle">
                      <th className="pb-3 font-medium">Period</th>
                      <th className="pb-3 font-medium text-right">Electricity</th>
                      <th className="pb-3 font-medium text-right">Gas</th>
                      <th className="pb-3 font-medium text-right">Water</th>
                      <th className="pb-3 font-medium text-right">Employees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(d => (
                      <tr key={d.id} className="border-b border-border-subtle/50 hover:bg-background-secondary/50">
                        <td className="py-3 text-white">{formatMonthYear(d.month, d.year)}</td>
                        <td className="py-3 text-right text-gray-300">{d.electricityKwh.toLocaleString()} kWh</td>
                        <td className="py-3 text-right text-gray-300">{d.naturalGasTherm.toLocaleString()} therms</td>
                        <td className="py-3 text-right text-gray-300">{d.waterGallons.toLocaleString()} gal</td>
                        <td className="py-3 text-right text-gray-300">{d.employeeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'objectives' && (
          <div className="bg-background-card rounded-xl border border-border-subtle p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Environmental Objectives</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors text-sm">
                <Plus size={16} />
                Add Objective
              </button>
            </div>

            {objectives.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Target size={32} className="mx-auto mb-2 opacity-50" />
                <p>No objectives defined yet</p>
                <p className="text-sm mt-1">Add objectives to track progress toward environmental targets</p>
              </div>
            ) : (
              <div className="space-y-4">
                {objectives.map(obj => (
                  <div key={obj.id} className="bg-background-secondary rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{obj.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{obj.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Target: {obj.targetValue}
                          {obj.targetType === 'reduction' ? '% reduction' : ''} by Q{obj.targetQuarter}{' '}
                          {obj.targetYear}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => {
                            if (confirm('Delete this objective?')) {
                              deleteObjective(obj.id);
                              setRefreshKey(k => k + 1);
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-accent-red transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-background-card rounded-xl border border-border-subtle p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Facility Name</label>
                <input
                  type="text"
                  value={settings.facilityName}
                  onChange={e => setSettings(s => ({ ...s, facilityName: e.target.value }))}
                  className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Default Square Feet</label>
                  <input
                    type="number"
                    value={settings.defaultSquareFeet}
                    onChange={e => setSettings(s => ({ ...s, defaultSquareFeet: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Default Employee Count</label>
                  <input
                    type="number"
                    value={settings.defaultEmployeeCount}
                    onChange={e => setSettings(s => ({ ...s, defaultEmployeeCount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Admin Password</label>
                <input
                  type="password"
                  value={settings.adminPassword}
                  onChange={e => setSettings(s => ({ ...s, adminPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-background-input border border-border-subtle rounded-lg text-white focus:border-accent-purple transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Change the password to secure data entry</p>
              </div>
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-hover transition-colors"
              >
                <Save size={18} />
                {settingsSaved ? 'Saved!' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
