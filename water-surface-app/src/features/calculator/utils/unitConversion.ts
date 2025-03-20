import { ChannelParams, UnitSystem } from "../types";

// Conversion factors
const METER_TO_FOOT = 3.28084;
const FOOT_TO_METER = 0.3048;
const SQUARE_METER_TO_SQUARE_FOOT = 10.7639;
const SQUARE_FOOT_TO_SQUARE_METER = 0.092903;
const CUBIC_METER_PER_SECOND_TO_CUBIC_FOOT_PER_SECOND = 35.3147;
const CUBIC_FOOT_PER_SECOND_TO_CUBIC_METER_PER_SECOND = 0.0283168;

/**
 * Convert channel parameters from one unit system to another
 * This function handles various parameter types:
 * - Length measurements (using METER_TO_FOOT or FOOT_TO_METER)
 * - Area measurements (using SQUARE_METER_TO_SQUARE_FOOT or SQUARE_FOOT_TO_SQUARE_METER)
 * - Flow rate (using CUBIC_METER_PER_SECOND_TO_CUBIC_FOOT_PER_SECOND or CUBIC_FOOT_PER_SECOND_TO_CUBIC_METER_PER_SECOND)
 * 
 * @param params Original channel parameters
 * @param targetUnitSystem Target unit system ('metric' or 'imperial')
 * @returns Converted channel parameters
 */
export function convertChannelParams(
  params: ChannelParams,
  targetUnitSystem: UnitSystem
): ChannelParams {
  // If already in the target unit system, return original
  if (params.units === targetUnitSystem) {
    return { ...params };
  }

  // Create new parameters object
  const newParams: ChannelParams = {
    ...params,
    units: targetUnitSystem
  };

  // Convert from metric to imperial
  if (params.units === 'metric' && targetUnitSystem === 'imperial') {
    // Convert length measurements
    if (params.bottomWidth !== undefined) newParams.bottomWidth = params.bottomWidth * METER_TO_FOOT;
    if (params.diameter !== undefined) newParams.diameter = params.diameter * METER_TO_FOOT;
    // Side slope is dimensionless, no conversion needed
    
    // Convert discharge
    newParams.discharge = params.discharge * CUBIC_METER_PER_SECOND_TO_CUBIC_FOOT_PER_SECOND;
    
    // Convert length
    newParams.length = params.length * METER_TO_FOOT;
    
    // Convert depths if present
    if (params.upstreamDepth !== undefined) newParams.upstreamDepth = params.upstreamDepth * METER_TO_FOOT;
    if (params.downstreamDepth !== undefined) newParams.downstreamDepth = params.downstreamDepth * METER_TO_FOOT;
    if (params.criticalDepth !== undefined) newParams.criticalDepth = params.criticalDepth * METER_TO_FOOT;
    if (params.normalDepth !== undefined) newParams.normalDepth = params.normalDepth * METER_TO_FOOT;
    
    // Convert other geometry properties if present in the extended object
    const extendedParams = params as any;
    const extendedNewParams = newParams as any;
    
    if (extendedParams.area !== undefined) 
      extendedNewParams.area = extendedParams.area * SQUARE_METER_TO_SQUARE_FOOT;
    if (extendedParams.topWidth !== undefined) 
      extendedNewParams.topWidth = extendedParams.topWidth * METER_TO_FOOT;
    if (extendedParams.wetPerimeter !== undefined) 
      extendedNewParams.wetPerimeter = extendedParams.wetPerimeter * METER_TO_FOOT;
    
    // Slope is dimensionless, no conversion needed
  }
  // Convert from imperial to metric
  else if (params.units === 'imperial' && targetUnitSystem === 'metric') {
    // Convert length measurements
    if (params.bottomWidth !== undefined) newParams.bottomWidth = params.bottomWidth * FOOT_TO_METER;
    if (params.diameter !== undefined) newParams.diameter = params.diameter * FOOT_TO_METER;
    // Side slope is dimensionless, no conversion needed
    
    // Convert discharge
    newParams.discharge = params.discharge * CUBIC_FOOT_PER_SECOND_TO_CUBIC_METER_PER_SECOND;
    
    // Convert length
    newParams.length = params.length * FOOT_TO_METER;
    
    // Convert depths if present
    if (params.upstreamDepth !== undefined) newParams.upstreamDepth = params.upstreamDepth * FOOT_TO_METER;
    if (params.downstreamDepth !== undefined) newParams.downstreamDepth = params.downstreamDepth * FOOT_TO_METER;
    if (params.criticalDepth !== undefined) newParams.criticalDepth = params.criticalDepth * FOOT_TO_METER;
    if (params.normalDepth !== undefined) newParams.normalDepth = params.normalDepth * FOOT_TO_METER;
    
    // Convert other geometry properties if present in the extended object
    const extendedParams = params as any;
    const extendedNewParams = newParams as any;
    
    if (extendedParams.area !== undefined) 
      extendedNewParams.area = extendedParams.area * SQUARE_FOOT_TO_SQUARE_METER;
    if (extendedParams.topWidth !== undefined) 
      extendedNewParams.topWidth = extendedParams.topWidth * FOOT_TO_METER;
    if (extendedParams.wetPerimeter !== undefined) 
      extendedNewParams.wetPerimeter = extendedParams.wetPerimeter * FOOT_TO_METER;
    
    // Slope is dimensionless, no conversion needed
  }

  return newParams;
}

/**
 * Get the unit label for a specific parameter
 * @param paramName Parameter name
 * @param unitSystem Unit system
 * @returns Unit label
 */
export function getUnitLabel(paramName: string, unitSystem: UnitSystem): string {
  const unitLabels: Record<string, Record<UnitSystem, string>> = {
    bottomWidth: { metric: 'm', imperial: 'ft' },
    diameter: { metric: 'm', imperial: 'ft' },
    length: { metric: 'm', imperial: 'ft' },
    depth: { metric: 'm', imperial: 'ft' },
    upstreamDepth: { metric: 'm', imperial: 'ft' },
    downstreamDepth: { metric: 'm', imperial: 'ft' },
    discharge: { metric: 'm³/s', imperial: 'ft³/s' },
    velocity: { metric: 'm/s', imperial: 'ft/s' },
    energy: { metric: 'm', imperial: 'ft' },
    station: { metric: 'm', imperial: 'ft' },
    area: { metric: 'm²', imperial: 'ft²' },
    topWidth: { metric: 'm', imperial: 'ft' },
    wetPerimeter: { metric: 'm', imperial: 'ft' },
    // No unit for these
    channelSlope: { metric: 'm/m', imperial: 'ft/ft' },
    manningN: { metric: '', imperial: '' },
    sideSlope: { metric: '', imperial: '' },
    froudeNumber: { metric: '', imperial: '' },
  };

  return unitLabels[paramName]?.[unitSystem] || '';
}