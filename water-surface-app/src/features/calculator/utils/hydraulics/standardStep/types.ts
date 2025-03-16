/**
 * Types for standard step method calculations
 * Re-exports types from the central types definition and adds specific types
 * for the standard step implementation
 */

import {
  ChannelParams,
  FlowDepthPoint,
  HydraulicJump,
  CalculationDirection,
  ChannelSlope,
  ProfileType,
  FlowRegime,
  WaterSurfaceProfileResults as BaseWaterSurfaceProfileResults,
  StepCalculationParams,
  ProfileCalculationParams
} from '../../../types';

// Re-export types from central definition
export type {
  FlowDepthPoint,
  StepCalculationParams,
  ProfileCalculationParams,
  ChannelParams
};

// Re-export enums
export { ProfileType, FlowRegime };

// Extended WaterSurfaceProfileResults interface that uses ProfileType enum directly
export interface WaterSurfaceProfileResults extends Omit<BaseWaterSurfaceProfileResults, 'profileType'> {
  flowProfile: FlowDepthPoint[];
  profileType: ProfileType;  // Using ProfileType enum instead of string
  channelType: string;
  criticalDepth: number;
  normalDepth: number;
  isChoking: boolean;
  hydraulicJump?: HydraulicJump;
  // Optional properties for additional analysis
  profileDescription?: string;
  profileDetails?: string;
  stats?: ProfileStatistics;
}

/**
 * Interface for calculation result at a single point
 * Contains hydraulic properties calculated at a specific water depth
 */
export interface CalculationPoint {
  depth: number;
  velocity: number;
  froudeNumber: number;
  specificEnergy: number;
  area: number;
  hydraulicRadius: number;
  frictionSlope: number;
}

/**
 * Extended hydraulic jump result with additional technical details
 * used for internal calculations in the standard step implementation
 */
export interface HydraulicJumpResult extends Omit<HydraulicJump, 'occurs'> {
  position: number;             // Location of jump (required internally)
  depth1: number;               // Upstream depth (required internally)
  depth2: number;               // Downstream depth (required internally)
  energyLoss: number;           // Energy loss at jump
  froudeNumber1: number;        // Upstream Froude number
  length: number;               // Approximate length of hydraulic jump
  sequentDepthRatio?: number;   // Ratio of downstream to upstream depth (y2/y1)
  efficiency?: number;          // Jump efficiency (1 - energy loss / upstream energy)
}

/**
 * Options for standard step calculation
 */
export interface StandardStepOptions {
  numSteps?: number;            // Number of calculation points
  tolerance?: number;           // Convergence tolerance
  maxIterations?: number;       // Maximum iterations for each step
  includeHydraulicJump?: boolean; // Whether to check for hydraulic jumps
  adaptiveStepSize?: boolean;   // Whether to use adaptive step size
  method?: 'simple' | 'newtonRaphson' | 'automatic'; // Solution method
}

/**
 * Default options for standard step calculation
 */
export const DEFAULT_STANDARD_STEP_OPTIONS: StandardStepOptions = {
  numSteps: 100,
  tolerance: 0.0001,
  maxIterations: 50,
  includeHydraulicJump: true,
  adaptiveStepSize: false,
  method: 'automatic'
};

/**
 * Result from a standard step calculation with detail
 */
export interface DetailedStandardStepResult extends WaterSurfaceProfileResults {
  executionTime?: number;       // Calculation time in milliseconds
  iterationCount?: number;      // Total number of iterations
  convergencePoints?: number;   // Number of points that converged
  warnings?: string[];          // Any warnings during calculation
}

/**
 * Interface for profile statistics
 */
export interface ProfileStatistics {
  minDepth: number;
  maxDepth: number;
  avgDepth: number;
  minVelocity: number;
  maxVelocity: number;
  avgVelocity: number;
  minFroude: number;
  maxFroude: number;
  avgFroude: number;
  minEnergy: number;
  maxEnergy: number;
  avgEnergy: number;
  length: number;
  numPoints: number;
  predominantFlowRegime: string;
}

/**
 * Function to convert between HydraulicJumpResult and HydraulicJump
 * @param result Detailed hydraulic jump result
 * @returns Simplified hydraulic jump for use in UI
 */
export function convertToHydraulicJump(result: HydraulicJumpResult | undefined): HydraulicJump {
  if (!result) return { occurs: false };
  return {
    occurs: true,
    station: result.position,
    upstreamDepth: result.depth1,
    downstreamDepth: result.depth2,
    energyLoss: result.energyLoss,
    froudeNumber1: result.froudeNumber1,
    length: result.length
  };
}

/**
 * Function to convert from FlowDepthPoint array to standard calculation results
 * @param flowPoints Array of flow depth points
 * @returns Water surface profile results object
 */
export function createWaterSurfaceResults(
  flowPoints: FlowDepthPoint[],
  channelSlope: ChannelSlope,
  criticalDepth: number,
  normalDepth: number,
  jumpResult?: HydraulicJumpResult
): WaterSurfaceProfileResults {
  // Get first point to determine profile type
  const initialDepth = flowPoints.length > 0 ? flowPoints[0].y : 0;
  
  // Determine profile type
  let profileType: ProfileType;
  
  if (channelSlope === 'mild') {
    if (initialDepth > normalDepth) profileType = ProfileType.M1;
    else if (initialDepth < normalDepth && initialDepth > criticalDepth) profileType = ProfileType.M2;
    else profileType = ProfileType.M3;
  } else if (channelSlope === 'steep') {
    if (initialDepth > criticalDepth) profileType = ProfileType.S1;
    else if (initialDepth < criticalDepth && initialDepth > normalDepth) profileType = ProfileType.S2;
    else profileType = ProfileType.S3;
  } else {
    if (initialDepth > criticalDepth) profileType = ProfileType.C1;
    else if (initialDepth < criticalDepth) profileType = ProfileType.C3;
    else profileType = ProfileType.C2;
  }
  
  // Create simplified hydraulic jump if provided
  const hydraulicJump = jumpResult ? convertToHydraulicJump(jumpResult) : undefined;
  
  return {
    flowProfile: flowPoints,
    profileType, // Using ProfileType enum directly
    channelType: channelSlope,
    criticalDepth,
    normalDepth,
    isChoking: false, // Would be determined during calculation
    hydraulicJump
  };
}

/**
 * Function to determine calculation direction from profile type
 * @param profileType Water surface profile type
 * @returns Recommended calculation direction
 */
export function getDirectionFromProfileType(profileType: ProfileType): CalculationDirection {
  // For M1, M2, S1 profiles, calculate from downstream to upstream
  if (
    profileType === ProfileType.M1 ||
    profileType === ProfileType.M2 ||
    profileType === ProfileType.S1
  ) {
    return 'upstream';
  } 
  
  // For all others, calculate from upstream to downstream
  return 'downstream';
}