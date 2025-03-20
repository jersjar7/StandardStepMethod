/**
 * Channel types for Redux store
 * Import and re-export types from the central types definition
 */

import { ChannelParams, ChannelType, UnitSystem } from '../../types';

// Re-export the types from central definition
export type { ChannelParams, ChannelType, UnitSystem };

/**
 * Default channel parameters by type
 */
export const defaultChannelParams: Record<ChannelType, ChannelParams> = {
  rectangular: {
    channelType: 'rectangular',
    bottomWidth: 10,
    manningN: 0.03,
    channelSlope: 0.001,
    discharge: 50,
    length: 1000,
    units: 'imperial'
  },
  
  trapezoidal: {
    channelType: 'trapezoidal',
    bottomWidth: 8,
    sideSlope: 2,
    manningN: 0.035,
    channelSlope: 0.001,
    discharge: 60,
    length: 1000,
    units: 'imperial'
  },
  
  triangular: {
    channelType: 'triangular',
    bottomWidth: 0,
    sideSlope: 1.5,
    manningN: 0.025,
    channelSlope: 0.002,
    discharge: 30,
    length: 1000,
    units: 'imperial'
  },
  
  circular: {
    channelType: 'circular',
    bottomWidth: 0,
    diameter: 2.0,
    manningN: 0.015,
    channelSlope: 0.001,
    discharge: 20,
    length: 1000,
    units: 'imperial'
  }
};

/**
 * Channel parameter validation constraints
 */
export interface ChannelParamConstraints {
  min: number;
  max: number;
  step: number;
  default: number;
  label: string;
  unit: string;
}

/**
 * Validation constraints for various channel parameters
 */
export const channelParamConstraints: Record<string, ChannelParamConstraints> = {
  bottomWidth: {
    min: 0.1,
    max: 100,
    step: 0.1,
    default: 10,
    label: 'Bottom Width',
    unit: 'm'
  },
  
  sideSlope: {
    min: 0.1,
    max: 10,
    step: 0.1,
    default: 2,
    label: 'Side Slope (H:V)',
    unit: ''
  },
  
  diameter: {
    min: 0.1,
    max: 10,
    step: 0.1,
    default: 2,
    label: 'Diameter',
    unit: 'm'
  },
  
  manningN: {
    min: 0.001,
    max: 0.2,
    step: 0.001,
    default: 0.03,
    label: 'Manning\'s Roughness',
    unit: ''
  },
  
  channelSlope: {
    min: 0.0001,
    max: 0.1,
    step: 0.0001,
    default: 0.001,
    label: 'Channel Slope',
    unit: 'm/m'
  },
  
  discharge: {
    min: 0.1,
    max: 1000,
    step: 0.1,
    default: 50,
    label: 'Discharge',
    unit: 'm³/s'
  },
  
  length: {
    min: 10,
    max: 10000,
    step: 10,
    default: 1000,
    label: 'Channel Length',
    unit: 'm'
  },
  
  upstreamDepth: {
    min: 0.01,
    max: 50,
    step: 0.01,
    default: 1,
    label: 'Upstream Depth',
    unit: 'm'
  },
  
  downstreamDepth: {
    min: 0.01,
    max: 50,
    step: 0.01,
    default: 0.5,
    label: 'Downstream Depth',
    unit: 'm'
  }
};

/**
 * Helper to get the required parameters for a channel type
 * @param channelType Type of channel
 * @returns Array of required parameter names
 */
export function getRequiredParamsForChannelType(channelType: ChannelType): string[] {
  // Base required parameters for all channel types
  const baseParams = ['manningN', 'channelSlope', 'discharge', 'length'];
  
  // Add channel-type specific parameters
  switch (channelType) {
    case 'rectangular':
      return [...baseParams, 'bottomWidth'];
    
    case 'trapezoidal':
      return [...baseParams, 'bottomWidth', 'sideSlope'];
    
    case 'triangular':
      return [...baseParams, 'sideSlope'];
    
    case 'circular':
      return [...baseParams, 'diameter'];
    
    default:
      return baseParams;
  }
}

/**
 * Get the default channel parameters for a specific channel type
 * @param channelType Type of channel
 * @returns Default channel parameters
 */
export function getDefaultChannelParams(channelType: ChannelType): ChannelParams {
  return defaultChannelParams[channelType];
}

/**
 * Updates channel parameters to be consistent with the channel type
 * @param channelType Type of channel
 * @param currentParams Current channel parameters
 * @returns Updated channel parameters
 */
export function getUpdatedChannelParams(
  channelType: ChannelType,
  currentParams: Partial<ChannelParams>
): ChannelParams {
  // Get default parameters for this channel type
  const defaultParams = defaultChannelParams[channelType];
  
  // Create new parameters based on channel type
  switch (channelType) {
    case 'rectangular':
      return {
        ...defaultParams,
        ...currentParams,
        channelType,
        bottomWidth: currentParams.bottomWidth || defaultParams.bottomWidth,
        sideSlope: undefined,
        diameter: undefined
      };
    
    case 'trapezoidal':
      return {
        ...defaultParams,
        ...currentParams,
        channelType,
        bottomWidth: currentParams.bottomWidth || defaultParams.bottomWidth,
        sideSlope: currentParams.sideSlope || defaultParams.sideSlope,
        diameter: undefined
      };
    
    case 'triangular':
      return {
        ...defaultParams,
        ...currentParams,
        channelType,
        bottomWidth: 0,
        sideSlope: currentParams.sideSlope || defaultParams.sideSlope,
        diameter: undefined
      };
    
    case 'circular':
      return {
        ...defaultParams,
        ...currentParams,
        channelType,
        bottomWidth: 0,
        sideSlope: undefined,
        diameter: currentParams.diameter || defaultParams.diameter
      };
    
    default:
      return { ...defaultParams, ...currentParams, channelType };
  }
}