'use client';

import { AppState, MonthlyData, Objective, AppSettings } from './types';

const STORAGE_KEY = 'ecometrics_data';

const DEFAULT_SETTINGS: AppSettings = {
  facilityName: 'Main Facility',
  defaultSquareFeet: 10000,
  defaultEmployeeCount: 25,
  adminPassword: 'eco2024', // Simple default, user should change
};

const DEFAULT_STATE: AppState = {
  monthlyData: [],
  objectives: [],
  settings: DEFAULT_SETTINGS,
};

/**
 * Get full app state from localStorage
 */
export function getAppState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;

    const parsed = JSON.parse(stored) as AppState;
    // Merge with defaults to handle missing fields from older versions
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return DEFAULT_STATE;
  }
}

/**
 * Save full app state to localStorage
 */
export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Get all monthly data
 */
export function getMonthlyData(): MonthlyData[] {
  return getAppState().monthlyData;
}

/**
 * Get monthly data for a specific month/year
 */
export function getMonthData(year: number, month: number): MonthlyData | undefined {
  return getMonthlyData().find(d => d.year === year && d.month === month);
}

/**
 * Save or update monthly data
 */
export function saveMonthlyData(data: MonthlyData): void {
  const state = getAppState();
  const existingIndex = state.monthlyData.findIndex(
    d => d.year === data.year && d.month === data.month
  );

  if (existingIndex >= 0) {
    state.monthlyData[existingIndex] = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
  } else {
    state.monthlyData.push({
      ...data,
      id: `${data.year}-${data.month}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort by date descending
  state.monthlyData.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  saveAppState(state);
}

/**
 * Delete monthly data
 */
export function deleteMonthlyData(year: number, month: number): void {
  const state = getAppState();
  state.monthlyData = state.monthlyData.filter(
    d => !(d.year === year && d.month === month)
  );
  saveAppState(state);
}

/**
 * Get all objectives
 */
export function getObjectives(): Objective[] {
  return getAppState().objectives;
}

/**
 * Save or update objective
 */
export function saveObjective(objective: Objective): void {
  const state = getAppState();
  const existingIndex = state.objectives.findIndex(o => o.id === objective.id);

  if (existingIndex >= 0) {
    state.objectives[existingIndex] = objective;
  } else {
    state.objectives.push({
      ...objective,
      id: objective.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
  }

  saveAppState(state);
}

/**
 * Delete objective
 */
export function deleteObjective(id: string): void {
  const state = getAppState();
  state.objectives = state.objectives.filter(o => o.id !== id);
  saveAppState(state);
}

/**
 * Get settings
 */
export function getSettings(): AppSettings {
  return getAppState().settings;
}

/**
 * Update settings
 */
export function updateSettings(settings: Partial<AppSettings>): void {
  const state = getAppState();
  state.settings = { ...state.settings, ...settings };
  saveAppState(state);
}

/**
 * Verify admin password
 */
export function verifyPassword(password: string): boolean {
  return password === getSettings().adminPassword;
}

/**
 * Export all data as JSON
 */
export function exportData(): string {
  return JSON.stringify(getAppState(), null, 2);
}

/**
 * Import data from JSON
 */
export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json) as AppState;
    saveAppState(data);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

/**
 * Generate sample data for demo/testing
 */
export function generateSampleData(): void {
  const state = getAppState();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Generate 12 months of sample data
  for (let i = 0; i < 12; i++) {
    let month = currentMonth - i;
    let year = currentYear;

    if (month <= 0) {
      month += 12;
      year -= 1;
    }

    // Base values with seasonal variation
    const seasonalFactor = 1 + 0.2 * Math.sin((month - 1) * Math.PI / 6);
    const randomVariation = () => 0.9 + Math.random() * 0.2;

    const data: MonthlyData = {
      id: `${year}-${month}`,
      year,
      month,
      electricityKwh: Math.round(15000 * seasonalFactor * randomVariation()),
      naturalGasTherm: Math.round(500 * (2 - seasonalFactor) * randomVariation()), // Higher in winter
      waterGallons: Math.round(25000 * randomVariation()),
      inboundDeliveryMiles: Math.round(800 * randomVariation()),
      outboundShippingMiles: Math.round(400 * randomVariation()),
      employeeCount: 25 + Math.floor(i / 4), // Slight growth
      squareFeet: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.monthlyData.push(data);
  }

  // Add sample objectives
  state.objectives = [
    {
      id: 'obj-1',
      name: 'Reduce Electricity Intensity',
      description: 'Reduce electricity consumption per employee by 10%',
      metric: 'electricityIntensity',
      targetType: 'reduction',
      targetValue: 10,
      baselineValue: 600, // kWh per employee
      baselineYear: currentYear - 1,
      baselineQuarter: 4,
      targetYear: currentYear,
      targetQuarter: 4,
      status: 'on-track',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'obj-2',
      name: 'Water Conservation',
      description: 'Reduce total water consumption by 5%',
      metric: 'water',
      targetType: 'reduction',
      targetValue: 5,
      baselineValue: 300000, // gallons per year
      baselineYear: currentYear - 1,
      baselineQuarter: 4,
      targetYear: currentYear,
      targetQuarter: 4,
      status: 'at-risk',
      createdAt: new Date().toISOString(),
    },
  ];

  saveAppState(state);
}
