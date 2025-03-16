/**
 * Result types for Redux store
 * Import and re-export types from the central types definition
 */

import { 
  CalculationResult, 
  FlowDepthPoint, 
  WaterSurfaceProfileResults,
  ProfileStatistics,
  FlowRegime,
  ProfileType
} from '../../types';

import {
  HydraulicJump,
  isOccurringJump
} from '../../types/hydraulicJumpTypes';

// Re-export the types from central definition
export type { 
  CalculationResult,
  FlowDepthPoint, 
  HydraulicJump, 
  WaterSurfaceProfileResults,
  ProfileStatistics,
  FlowRegime
};

// Re-export enums and functions
export { ProfileType, isOccurringJump };

/**
 * Flow regime description options
 */
export const FLOW_REGIME_DESCRIPTIONS: Record<FlowRegime, string> = {
  [FlowRegime.SUBCRITICAL]: 'Subcritical Flow (Fr < 1)',
  [FlowRegime.CRITICAL]: 'Critical Flow (Fr = 1)',
  [FlowRegime.SUPERCRITICAL]: 'Supercritical Flow (Fr > 1)'
};

/**
 * Profile type descriptions
 */
export const PROFILE_TYPE_DESCRIPTIONS: Record<ProfileType, string> = {
  [ProfileType.M1]: 'M1 - Backwater Curve (Mild Slope)',
  [ProfileType.M2]: 'M2 - Drawdown Curve (Mild Slope)',
  [ProfileType.M3]: 'M3 - Rapidly Varied Flow (Mild Slope)',
  [ProfileType.S1]: 'S1 - Backwater Curve (Steep Slope)',
  [ProfileType.S2]: 'S2 - Drawdown Curve (Steep Slope)',
  [ProfileType.S3]: 'S3 - Rapidly Varied Flow (Steep Slope)',
  [ProfileType.C1]: 'C1 - Backwater Curve (Critical Slope)',
  [ProfileType.C2]: 'C2 - Uniform Flow (Critical Slope)',
  [ProfileType.C3]: 'C3 - Drawdown Curve (Critical Slope)',
  [ProfileType.UNKNOWN]: 'Unknown Profile Type'
};

/**
 * Channel slope descriptions
 */
export const CHANNEL_SLOPE_DESCRIPTIONS = {
  'mild': 'Mild Slope (yn > yc)',
  'critical': 'Critical Slope (yn = yc)',
  'steep': 'Steep Slope (yn < yc)'
};

/**
 * Hydraulic jump classification
 */
export interface HydraulicJumpClassification {
  type: 'undular' | 'weak' | 'oscillating' | 'steady' | 'strong';
  description: string;
  froudeRange: string;
}

/**
 * Hydraulic jump classifications based on upstream Froude number
 */
export const HYDRAULIC_JUMP_CLASSIFICATIONS: HydraulicJumpClassification[] = [
  {
    type: 'undular',
    description: 'Undular Jump - Small waves, minimal energy loss',
    froudeRange: '1.0 - 1.7'
  },
  {
    type: 'weak',
    description: 'Weak Jump - Smooth surface, low energy dissipation',
    froudeRange: '1.7 - 2.5'
  },
  {
    type: 'oscillating',
    description: 'Oscillating Jump - Unstable, pulsating flow with surface waves',
    froudeRange: '2.5 - 4.5'
  },
  {
    type: 'steady',
    description: 'Steady Jump - Well-defined, stable jump with good energy dissipation',
    froudeRange: '4.5 - 9.0'
  },
  {
    type: 'strong',
    description: 'Strong Jump - Intense turbulence, high energy dissipation',
    froudeRange: '> 9.0'
  }
];

/**
 * Result export configuration
 */
export interface ResultExportConfig {
  includeChannelParams: boolean;
  includeHydraulicJump: boolean;
  decimalPlaces: number;
  stationInterval?: number; // Optional parameter to export results at specific intervals
}

/**
 * Default export configuration
 */
export const DEFAULT_EXPORT_CONFIG: ResultExportConfig = {
  includeChannelParams: true,
  includeHydraulicJump: true,
  decimalPlaces: 3
};

/**
 * Classify a hydraulic jump based on upstream Froude number
 * @param froudeNumber1 Upstream Froude number
 * @returns Classification of the hydraulic jump
 */
export function classifyHydraulicJump(froudeNumber1: number): HydraulicJumpClassification | null {
  if (froudeNumber1 < 1) {
    return null; // No jump
  } else if (froudeNumber1 < 1.7) {
    return HYDRAULIC_JUMP_CLASSIFICATIONS[0]; // Undular
  } else if (froudeNumber1 < 2.5) {
    return HYDRAULIC_JUMP_CLASSIFICATIONS[1]; // Weak
  } else if (froudeNumber1 < 4.5) {
    return HYDRAULIC_JUMP_CLASSIFICATIONS[2]; // Oscillating
  } else if (froudeNumber1 < 9.0) {
    return HYDRAULIC_JUMP_CLASSIFICATIONS[3]; // Steady
  } else {
    return HYDRAULIC_JUMP_CLASSIFICATIONS[4]; // Strong
  }
}

/**
 * Get flow regime based on Froude number
 * @param froudeNumber Froude number
 * @returns Flow regime
 */
export function getFlowRegime(froudeNumber: number): FlowRegime {
  if (froudeNumber < 0.95) {
    return FlowRegime.SUBCRITICAL;
  } else if (froudeNumber > 1.05) {
    return FlowRegime.SUPERCRITICAL;
  } else {
    return FlowRegime.CRITICAL;
  }
}

/**
 * Get a description of the flow regime based on Froude number
 * @param froudeNumber Froude number
 * @returns Description of the flow regime
 */
export function getFlowRegimeDescription(froudeNumber: number): string {
  return FLOW_REGIME_DESCRIPTIONS[getFlowRegime(froudeNumber)];
}

/**
 * Determine the profile type based on channel characteristics and depths
 * @param channelSlope Channel slope classification ('mild', 'critical', or 'steep')
 * @param depth Current flow depth
 * @param normalDepth Normal depth
 * @param criticalDepth Critical depth
 * @returns Profile type classification
 */
export function determineProfileType(
  channelSlope: string, 
  depth: number, 
  normalDepth: number, 
  criticalDepth: number
): ProfileType {
  if (channelSlope === 'mild') {
    if (depth > normalDepth) return ProfileType.M1;
    if (depth < normalDepth && depth > criticalDepth) return ProfileType.M2;
    if (depth < criticalDepth) return ProfileType.M3;
  } else if (channelSlope === 'steep') {
    if (depth > criticalDepth) return ProfileType.S1;
    if (depth < criticalDepth && depth > normalDepth) return ProfileType.S2;
    if (depth < normalDepth) return ProfileType.S3;
  } else if (channelSlope === 'critical') {
    if (depth > criticalDepth) return ProfileType.C1;
    if (depth < criticalDepth) return ProfileType.C3;
    return ProfileType.C2;
  }
  
  return ProfileType.UNKNOWN;
}

/**
 * Get a description of the profile type
 * @param profileType Profile type enum value
 * @returns Description of the profile type
 */
export function getProfileTypeDescription(profileType: ProfileType): string {
  return PROFILE_TYPE_DESCRIPTIONS[profileType] || 'Unknown Profile Type';
}