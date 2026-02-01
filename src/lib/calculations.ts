import { MonthlyData, EmissionsData, IntensityMetrics, QuarterRef } from './types';

// EPA Emission Factors (2024)
// Source: EPA GHG Emission Factors Hub

// Scope 1: Natural Gas - Direct Combustion
// 0.0053 metric tons CO2 per therm (53.06 kg CO2/MMBtu, converted)
export const NATURAL_GAS_KG_CO2_PER_THERM = 5.3;

// Scope 2: Electricity - US Average Grid
// 0.417 kg CO2 per kWh (US national average, varies by region)
// California is cleaner ~0.25 kg/kWh, but using national average for conservative estimate
export const ELECTRICITY_KG_CO2_PER_KWH = 0.417;

// Scope 3: Transportation
// Average medium/heavy duty truck: ~0.161 kg CO2 per mile
// Using EPA MOVES model estimate
export const TRANSPORT_KG_CO2_PER_MILE = 0.161;

/**
 * Calculate emissions from monthly utility data
 */
export function calculateEmissions(data: MonthlyData): EmissionsData {
  // Scope 1: Natural gas combustion
  const scope1 = data.naturalGasTherm * NATURAL_GAS_KG_CO2_PER_THERM;

  // Scope 2: Electricity consumption
  const scope2 = data.electricityKwh * ELECTRICITY_KG_CO2_PER_KWH;

  // Scope 3: Transportation (inbound + outbound)
  const totalMiles = data.inboundDeliveryMiles + data.outboundShippingMiles;
  const scope3 = totalMiles * TRANSPORT_KG_CO2_PER_MILE;

  const total = scope1 + scope2 + scope3;

  return { scope1, scope2, scope3, total };
}

/**
 * Calculate intensity metrics for a given month
 */
export function calculateIntensity(data: MonthlyData): IntensityMetrics {
  const emissions = calculateEmissions(data);
  const employees = data.employeeCount || 1; // Avoid division by zero
  const sqft = data.squareFeet || 1;

  return {
    electricityPerEmployee: data.electricityKwh / employees,
    electricityPerSqFt: data.electricityKwh / sqft,
    waterPerEmployee: data.waterGallons / employees,
    waterPerSqFt: data.waterGallons / sqft,
    carbonPerEmployee: emissions.total / employees,
    carbonPerSqFt: emissions.total / sqft,
  };
}

/**
 * Aggregate multiple months of data
 */
export function aggregateMonthlyData(months: MonthlyData[]): MonthlyData | null {
  if (months.length === 0) return null;

  const aggregated: MonthlyData = {
    id: 'aggregated',
    year: months[0].year,
    month: months[0].month,
    electricityKwh: 0,
    naturalGasTherm: 0,
    waterGallons: 0,
    inboundDeliveryMiles: 0,
    outboundShippingMiles: 0,
    employeeCount: 0,
    squareFeet: months[0].squareFeet, // Use first month's square feet
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (const month of months) {
    aggregated.electricityKwh += month.electricityKwh;
    aggregated.naturalGasTherm += month.naturalGasTherm;
    aggregated.waterGallons += month.waterGallons;
    aggregated.inboundDeliveryMiles += month.inboundDeliveryMiles;
    aggregated.outboundShippingMiles += month.outboundShippingMiles;
    aggregated.employeeCount = Math.max(aggregated.employeeCount, month.employeeCount);
  }

  // Average employee count across months
  aggregated.employeeCount = Math.round(
    months.reduce((sum, m) => sum + m.employeeCount, 0) / months.length
  );

  return aggregated;
}

/**
 * Get quarter from month (1-4)
 */
export function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

/**
 * Get months for a given quarter
 */
export function getQuarterMonths(quarter: number): number[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
}

/**
 * Filter data for a specific quarter
 */
export function filterByQuarter(data: MonthlyData[], year: number, quarter: number): MonthlyData[] {
  const quarterMonths = getQuarterMonths(quarter);
  return data.filter(d => d.year === year && quarterMonths.includes(d.month));
}

/**
 * Filter data for year to date
 */
export function filterYearToDate(data: MonthlyData[], year: number, throughMonth: number): MonthlyData[] {
  return data.filter(d => d.year === year && d.month <= throughMonth);
}

/**
 * Calculate percent change between two values
 */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format kg CO2 to metric tons
 */
export function kgToMetricTons(kg: number): number {
  return kg / 1000;
}

/**
 * Get current quarter reference
 */
export function getCurrentQuarter(): QuarterRef {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: getQuarter(now.getMonth() + 1),
  };
}

/**
 * Get previous quarter reference
 */
export function getPreviousQuarter(current: QuarterRef): QuarterRef {
  if (current.quarter === 1) {
    return { year: current.year - 1, quarter: 4 };
  }
  return { year: current.year, quarter: current.quarter - 1 };
}

/**
 * Format quarter for display (e.g., "Q1 2024")
 */
export function formatQuarter(ref: QuarterRef): string {
  return `Q${ref.quarter} ${ref.year}`;
}

/**
 * Month names
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format month/year for display
 */
export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
