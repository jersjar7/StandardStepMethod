import { ChannelParams, CalculationResult } from '../stores/calculatorSlice';

/**
 * Helper functions for the calculator feature
 */

/**
 * Formats a number with the specified number of decimal places
 * @param value The number to format
 * @param decimals The number of decimal places
 * @returns Formatted number as string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formats a value with its unit
 * @param value The value to format
 * @param unit The unit of the value
 * @param decimals The number of decimal places
 * @returns Formatted value with unit
 */
export function formatWithUnit(value: number, unit: string, decimals: number = 2): string {
  return `${formatNumber(value, decimals)} ${unit}`;
}

/**
 * Determines the profile type based on calculation results
 * @param results Calculation results
 * @returns Profile type description
 */
export function determineProfileType(results: CalculationResult[]): string {
  if (results.length === 0) return '';
  
  // Get first result which contains critical and normal depths
  const firstResult = results[0];
  const criticalDepth = firstResult.criticalDepth || 0;
  const normalDepth = firstResult.normalDepth || 0;
  
  // Get average depth
  const averageDepth = results.reduce((sum, r) => sum + r.depth, 0) / results.length;
  
  // Determine profile type
  if (normalDepth > criticalDepth) {
    // Mild slope
    if (averageDepth > normalDepth) {
      return 'M1 - Backwater Profile (Mild Slope)';
    } else if (averageDepth < normalDepth && averageDepth > criticalDepth) {
      return 'M2 - Drawdown Profile (Mild Slope)';
    } else {
      return 'M3 - Rapidly Varied Profile (Mild Slope)';
    }
  } else if (normalDepth < criticalDepth) {
    // Steep slope
    if (averageDepth > criticalDepth) {
      return 'S1 - Backwater Profile (Steep Slope)';
    } else if (averageDepth < criticalDepth && averageDepth > normalDepth) {
      return 'S2 - Drawdown Profile (Steep Slope)';
    } else {
      return 'S3 - Rapidly Varied Profile (Steep Slope)';
    }
  } else {
    return 'Critical Slope Profile';
  }
}

/**
 * Gets default channel parameters based on channel type
 * @param channelType Type of channel
 * @returns Default channel parameters
 */
export function getDefaultChannelParams(
  channelType: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular'
): Partial<ChannelParams> {
  switch (channelType) {
    case 'rectangular':
      return {
        bottomWidth: 10,
        manningN: 0.03,
        channelSlope: 0.001,
        discharge: 50,
        length: 1000
      };
      
    case 'trapezoidal':
      return {
        bottomWidth: 8,
        sideSlope: 2,
        manningN: 0.035,
        channelSlope: 0.001,
        discharge: 60,
        length: 1000
      };
      
    case 'triangular':
      return {
        sideSlope: 1.5,
        manningN: 0.025,
        channelSlope: 0.002,
        discharge: 30,
        length: 1000
      };
      
    case 'circular':
      return {
        diameter: 2.0,
        manningN: 0.015,
        channelSlope: 0.001,
        discharge: 20,
        length: 1000
      };
  }
}

/**
 * Determines if a hydraulic jump is likely to occur
 * @param results Calculation results
 * @returns True if hydraulic jump is likely, false otherwise
 */
export function isHydraulicJumpLikely(results: CalculationResult[]): boolean {
  if (results.length < 2) return false;
  
  // Check for transition from supercritical to subcritical flow
  for (let i = 1; i < results.length; i++) {
    if (results[i-1].froudeNumber > 1 && results[i].froudeNumber < 1) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets the flow regime description based on Froude number
 * @param froudeNumber Froude number
 * @returns Flow regime description
 */
export function getFlowRegimeDescription(froudeNumber: number): string {
  if (froudeNumber < 0.95) {
    return 'Subcritical Flow';
  } else if (froudeNumber > 1.05) {
    return 'Supercritical Flow';
  } else {
    return 'Critical Flow';
  }
}

/**
 * Filters results to get a reduced dataset for visualization
 * This can be useful when dealing with a large number of calculation points
 * @param results Full calculation results
 * @param maxPoints Maximum number of points to include
 * @returns Filtered results
 */
export function getFilteredResultsForVisualization(
  results: CalculationResult[],
  maxPoints: number = 100
): CalculationResult[] {
  if (results.length <= maxPoints) return results;
  
  const step = Math.floor(results.length / maxPoints);
  
  return results.filter((_, index) => index % step === 0);
}

/**
 * Validates channel parameters to ensure they're physically meaningful
 * @param params Channel parameters
 * @returns Object with validation status and error messages
 */
export function validateChannelParams(params: ChannelParams): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  // Check for negative values
  if (params.discharge <= 0) errors.push('Discharge must be positive');
  if (params.channelSlope <= 0) errors.push('Channel slope must be positive');
  if (params.manningN <= 0) errors.push('Manning\'s roughness must be positive');
  if (params.length <= 0) errors.push('Channel length must be positive');
  
  // Check channel-specific parameters
  switch (params.channelType) {
    case 'rectangular':
    case 'trapezoidal':
      if (params.bottomWidth <= 0) errors.push('Bottom width must be positive');
      break;
      
    case 'trapezoidal':
    case 'triangular':
      if (!params.sideSlope || params.sideSlope <= 0) 
        errors.push('Side slope must be positive');
      break;
      
    case 'circular':
      if (!params.diameter || params.diameter <= 0) 
        errors.push('Diameter must be positive');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}