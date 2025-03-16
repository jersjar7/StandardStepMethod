/**
 * Formatting utilities for the water surface profile calculator
 * Provides consistent formatting and unit display across the application
 */

import { UnitSystem } from '../features/calculator/types';

/**
 * Unit definitions for different measurement types in metric and imperial systems
 */
export const UNITS = {
  length: {
    metric: 'm',
    imperial: 'ft'
  },
  area: {
    metric: 'm²',
    imperial: 'ft²'
  },
  velocity: {
    metric: 'm/s',
    imperial: 'ft/s'
  },
  discharge: {
    metric: 'm³/s',
    imperial: 'cfs'
  },
  slope: {
    metric: 'm/m',
    imperial: 'ft/ft'
  },
  energy: {
    metric: 'm',
    imperial: 'ft'
  },
  volume: {
    metric: 'm³',
    imperial: 'ft³'
  },
  dimensionless: {
    metric: '',
    imperial: ''
  }
};

/**
 * Measurement types for different hydraulic parameters
 */
export const MEASUREMENT_TYPES: Record<string, keyof typeof UNITS> = {
  station: 'length',
  depth: 'length',
  velocity: 'velocity',
  area: 'area',
  topWidth: 'length',
  wetPerimeter: 'length',
  hydraulicRadius: 'length',
  energy: 'energy',
  froudeNumber: 'dimensionless',
  criticalDepth: 'length',
  normalDepth: 'length',
  bottomWidth: 'length',
  diameter: 'length',
  manningN: 'dimensionless',
  channelSlope: 'slope',
  discharge: 'discharge',
  length: 'length'
};

/**
 * Formats a number to the specified number of decimal places
 * @param value Number to format
 * @param decimals Number of decimal places (default 2)
 * @returns Formatted number as string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formats a value with its appropriate unit based on the parameter name and unit system
 * @param value Value to format
 * @param paramName Name of the parameter (used to determine unit type)
 * @param unitSystem 'metric' or 'imperial' unit system
 * @param decimals Number of decimal places (default 3)
 * @returns Formatted value with unit
 */
export function formatWithUnit(
  value: number, 
  paramName: string, 
  unitSystem: UnitSystem = 'metric', 
  decimals: number = 3
): string {
  // Get measurement type based on parameter name
  const measurementType = MEASUREMENT_TYPES[paramName] || 'dimensionless';
  
  // Get unit for the measurement type and unit system
  const unit = UNITS[measurementType][unitSystem];
  
  return `${formatNumber(value, decimals)}${unit ? ' ' + unit : ''}`;
}

/**
 * Formats a number for display without units
 * @param value Number to format
 * @param decimals Number of decimal places (default 3)
 * @returns Formatted number as string
 */
export function formatDisplay(value: number, decimals: number = 3): string {
  // Handle NaN, Infinity, and other special cases
  if (!Number.isFinite(value)) return 'N/A';
  
  // Format number with specified decimal places
  return formatNumber(value, decimals);
}

/**
 * Formats a dimensionless number (like Froude number)
 * @param value Number to format
 * @param decimals Number of decimal places (default 3)
 * @returns Formatted number as string
 */
export function formatDimensionless(value: number, decimals: number = 3): string {
  return formatNumber(value, decimals);
}

/**
 * Formats a percentage value
 * @param value Ratio to format as percentage (e.g., 0.5 becomes 50%)
 * @param decimals Number of decimal places (default 1)
 * @returns Formatted percentage as string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value * 100, decimals)}%`;
}

/**
 * Converts a value between metric and imperial units
 * @param value Value to convert
 * @param paramName Name of the parameter (used to determine conversion factor)
 * @param fromSystem Source unit system
 * @param toSystem Target unit system
 * @returns Converted value
 */
export function convertUnits(
  value: number,
  paramName: string,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): number {
  // If the systems are the same, no conversion needed
  if (fromSystem === toSystem) return value;
  
  const measurementType = MEASUREMENT_TYPES[paramName] || 'dimensionless';
  
  // Conversion factors from metric to imperial
  const conversionFactors = {
    length: 3.28084,        // meters to feet
    area: 10.7639,          // square meters to square feet
    velocity: 3.28084,      // m/s to ft/s
    discharge: 35.3147,     // cubic meters per second to cubic feet per second
    volume: 35.3147,        // cubic meters to cubic feet
    energy: 3.28084,        // meters to feet (for energy head)
    slope: 1,               // dimensionless
    dimensionless: 1        // dimensionless
  };
  
  // Get the appropriate conversion factor
  const factor = conversionFactors[measurementType];
  
  // Convert from metric to imperial or vice versa
  if (fromSystem === 'metric' && toSystem === 'imperial') {
    return value * factor;
  } else {
    return value / factor;
  }
}

/**
 * Formats a date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

/**
 * Formats a time for display
 * @param date Date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString();
}

/**
 * Gets the display labels for parameters based on unit system
 * @param unitSystem Unit system ('metric' or 'imperial')
 * @returns Object with parameter labels
 */
export function getParameterLabels(unitSystem: UnitSystem = 'metric'): Record<string, string> {
  return {
    station: `Station (${UNITS.length[unitSystem]})`,
    depth: `Depth (${UNITS.length[unitSystem]})`,
    velocity: `Velocity (${UNITS.velocity[unitSystem]})`,
    area: `Area (${UNITS.area[unitSystem]})`,
    topWidth: `Top Width (${UNITS.length[unitSystem]})`,
    wetPerimeter: `Wetted Perimeter (${UNITS.length[unitSystem]})`,
    hydraulicRadius: `Hydraulic Radius (${UNITS.length[unitSystem]})`,
    energy: `Energy (${UNITS.energy[unitSystem]})`,
    froudeNumber: 'Froude Number',
    criticalDepth: `Critical Depth (${UNITS.length[unitSystem]})`,
    normalDepth: `Normal Depth (${UNITS.length[unitSystem]})`,
    bottomWidth: `Bottom Width (${UNITS.length[unitSystem]})`,
    diameter: `Diameter (${UNITS.length[unitSystem]})`,
    manningN: 'Manning\'s Roughness',
    channelSlope: `Channel Slope (${UNITS.slope[unitSystem]})`,
    discharge: `Discharge (${UNITS.discharge[unitSystem]})`,
    length: `Length (${UNITS.length[unitSystem]})`
  };
}