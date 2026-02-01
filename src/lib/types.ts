// Monthly utility data entry
export interface MonthlyData {
  id: string;
  year: number;
  month: number; // 1-12

  // Utilities
  electricityKwh: number;
  naturalGasTherm: number;
  waterGallons: number;

  // Scope 3 - Transportation
  inboundDeliveryMiles: number;
  outboundShippingMiles: number;

  // Facility info for intensity calculations
  employeeCount: number;
  squareFeet: number;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Environmental objective/target
export interface Objective {
  id: string;
  name: string;
  description: string;
  metric: 'electricity' | 'naturalGas' | 'water' | 'carbon' | 'electricityIntensity' | 'waterIntensity';
  targetType: 'absolute' | 'reduction'; // absolute value or % reduction from baseline
  targetValue: number;
  baselineValue?: number;
  baselineYear?: number;
  baselineQuarter?: number;
  targetYear: number;
  targetQuarter: number;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
  createdAt: string;
}

// Calculated emissions data
export interface EmissionsData {
  scope1: number; // Natural gas (direct combustion)
  scope2: number; // Electricity (indirect)
  scope3: number; // Transportation (value chain)
  total: number;
}

// Intensity metrics
export interface IntensityMetrics {
  electricityPerEmployee: number;
  electricityPerSqFt: number;
  waterPerEmployee: number;
  waterPerSqFt: number;
  carbonPerEmployee: number;
  carbonPerSqFt: number;
}

// Dashboard summary
export interface DashboardSummary {
  currentMonth: MonthlyData | null;
  previousMonth: MonthlyData | null;
  currentQuarter: MonthlyData[];
  previousQuarter: MonthlyData[];
  yearToDate: MonthlyData[];
  previousYearToDate: MonthlyData[];
}

// Quarter reference
export interface QuarterRef {
  year: number;
  quarter: number; // 1-4
}

// App settings
export interface AppSettings {
  facilityName: string;
  defaultSquareFeet: number;
  defaultEmployeeCount: number;
  adminPassword: string;
}

// Full app state stored in localStorage
export interface AppState {
  monthlyData: MonthlyData[];
  objectives: Objective[];
  settings: AppSettings;
}
