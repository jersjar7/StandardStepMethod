// src/features/calculator/utils/hydraulics/standardStep/types.ts

/**
 * Types for standard step method calculations
 * Imports shared types from core types and defines specialized types
 * for the standard step implementation
 */

import {
  ChannelParams,
  FlowDepthPoint,
  CalculationDirection,
  ChannelSlope,
  ProfileType,
  FlowRegime,
  ProfileStatistics,
  WaterSurfaceProfileResults
} from '../../../types';

// Re-export types from core definition that are used in this module
export type {
  FlowDepthPoint,
  ChannelParams,
  ProfileStatistics,
  WaterSurfaceProfileResults
};

// Export enums fully to allow usage as values
export { 
  ProfileType, 
  FlowRegime 
};

/**
 * Internal calculation parameters for the standard step method
 */
export interface StepCalculationParams {
  currentX: number;                // Current station
  currentY: number;                // Current depth
  nextX: number;                   // Next station
  direction: CalculationDirection; // Calculation direction
  params: ChannelParams;           // Channel parameters
}

/**
 * Profile calculation parameters used to initialize step calculations
 */
export interface ProfileCalculationParams {
  initialDepth: number;            // Initial water depth
  direction: CalculationDirection; // Calculation direction
  startPosition: number;           // Starting station
  criticalDepth: number;           // Critical depth
  normalDepth: number;             // Normal depth
  numSteps: number;                // Number of calculation steps
  channelSlope: ChannelSlope;      // Channel slope classification
  params: ChannelParams;           // Channel parameters
}

/**
 * Calculation point properties at a specific depth
 * Used internally for hydraulic calculations
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
 * Flow transition between different flow regimes
 */
export interface FlowTransition {
  fromRegime: FlowRegime;       // Initial flow regime
  toRegime: FlowRegime;         // Final flow regime
  station: number;              // Transition location
  fromDepth: number;            // Depth before transition
  toDepth: number;              // Depth after transition
  fromFroude: number;           // Froude number before transition
  toFroude: number;             // Froude number after transition
  isHydraulicJump: boolean;     // Whether this is a hydraulic jump
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
 * Result from a standard step calculation with detailed metadata
 * This extends the standard result with calculation details
 */
export interface DetailedStandardStepResult extends WaterSurfaceProfileResults {
  executionTime?: number;       // Calculation time in milliseconds
  iterationCount?: number;      // Total number of iterations
  convergencePoints?: number;   // Number of points that converged
  warnings?: string[];          // Any warnings during calculation
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