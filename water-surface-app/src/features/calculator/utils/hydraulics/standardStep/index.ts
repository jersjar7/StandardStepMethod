/**
 * Standard Step Method for Water Surface Profile Calculations
 * 
 * This module implements the standard step method for calculating
 * water surface profiles in open channels. It provides a modular approach
 * with separate functionality for profile calculation, step calculation,
 * hydraulic jump detection, and profile classification.
 * 
 * The standard step method is an iterative procedure used to compute the
 * water surface profile in gradually varied flow. It solves the energy equation
 * between two consecutive cross-sections, accounting for energy losses due
 * to friction and other factors.
 */

import { 
  ChannelParams, 
  FlowDepthPoint,
  HydraulicJump,
  ProfileType,
  FlowRegime,
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  CalculationResultWithError,
  StandardCalculationResult,
  ProfileStatistics
} from '../../../types';

// Import core calculation components
import { 
  calculateWaterSurfaceProfile as calculateBaseWaterSurfaceProfile, 
  calculateHighResolutionProfile,
  calculateBidirectionalProfile,
  determineProfileType,
  setupInitialConditions,
  validateCalculationParameters,
  interpolateProfileAtStations,
  createUniformProfile
} from './profileCalculator';

import { 
  calculateNextDepth, 
  calculateNextDepthNewtonRaphson,
  calculatePropertiesAtDepth
} from './stepCalculator';

import { 
  detectHydraulicJump, 
  detectMultipleJumps,
  incorporateJumpsIntoProfile,
  isJumpBetweenPoints,
  refineJumpLocation
} from './jumpDetector';

import {
  detectFlowTransitions,
  determineFlowRegime,
  classifyProfileByTransitions,
  findCriticalDepthLocation,
  findNormalDepthLocation,
  FlowTransition
} from './transitionDetector';

import {
  calculateProfileStatistics,
  getProfileDescription,
  simplifyProfile
} from './profileUtils';

// Import specialized calculation types
import { 
  StepCalculationParams,
  ProfileCalculationParams,
  CalculationPoint
} from './types';

// Export types for use in other components
export type { 
  StepCalculationParams,
  ProfileCalculationParams,
  CalculationPoint,
  FlowTransition
};

export { ProfileType, FlowRegime };

/**
 * Main export for water surface profile calculation
 * This is the primary function that should be used by the application
 * 
 * @param params Channel parameters including geometry, flow, and roughness
 * @returns Complete water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  return calculateBaseWaterSurfaceProfile(params);
}

/**
 * Export calculation functions for direct access
 */
export {
  // Main calculation functions
  calculateHighResolutionProfile,
  calculateBidirectionalProfile,
  
  // Profile setup and classification
  determineProfileType,
  setupInitialConditions,
  validateCalculationParameters,
  
  // Step calculation functions
  calculateNextDepth,
  calculateNextDepthNewtonRaphson,
  calculatePropertiesAtDepth,
  
  // Hydraulic jump detection
  detectHydraulicJump,
  detectMultipleJumps,
  incorporateJumpsIntoProfile,
  isJumpBetweenPoints,
  refineJumpLocation,
  
  // Flow transition detection
  detectFlowTransitions,
  determineFlowRegime,
  classifyProfileByTransitions,
  findCriticalDepthLocation,
  findNormalDepthLocation,
  
  // Profile analysis utilities
  calculateProfileStatistics,
  getProfileDescription,
  simplifyProfile,
  interpolateProfileAtStations,
  createUniformProfile
};

/**
 * Calculate water surface profile with validation and error handling
 * @param params Channel parameters
 * @returns Water surface profile calculation results or error
 */
export function calculateProfileWithErrorHandling(
  params: ChannelParams
): CalculationResultWithError {
  try {
    // Validate parameters
    const validation = validateCalculationParameters(params);
    if (!validation.isValid) {
      return { error: validation.message };
    }
    
    // Calculate profile
    const results = calculateWaterSurfaceProfile(params);
    
    return { results };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Calculate detailed water surface profile with additional analysis
 * @param params Channel parameters
 * @returns Detailed water surface profile results or error
 */
export function calculateDetailedProfile(
  params: ChannelParams
): { results?: DetailedWaterSurfaceResults; error?: string } {
  try {
    // First get standard results
    const results = calculateWaterSurfaceProfile(params);
    
    // Perform additional analysis
    const profileDescription = getProfileDescription(results.flowProfile, params);
    const profileStats = calculateProfileStatistics(results.flowProfile);
    
    // Return enhanced results
    const detailedResults: DetailedWaterSurfaceResults = {
      ...results,
      profileDescription: profileDescription.description,
      profileDetails: profileDescription.details,
      flowRegime: determineOverallFlowRegime(results),
      stats: profileStats
    };
    
    return { results: detailedResults };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Determine the overall flow regime based on calculation results
 * @param results Water surface profile results
 * @returns Predominant flow regime
 */
function determineOverallFlowRegime(results: WaterSurfaceProfileResults): FlowRegime {
  // Check if flowProfile is available
  if (!results.flowProfile || results.flowProfile.length === 0) {
    return FlowRegime.SUBCRITICAL; // Default if no data
  }
  
  // Count different flow regimes
  let subcriticalCount = 0;
  let supercriticalCount = 0;
  let criticalCount = 0;
  
  results.flowProfile.forEach(point => {
    if (point.froudeNumber < 0.95) subcriticalCount++;
    else if (point.froudeNumber > 1.05) supercriticalCount++;
    else criticalCount++;
  });
  
  // Determine predominant regime
  if (subcriticalCount > supercriticalCount && subcriticalCount > criticalCount) {
    return FlowRegime.SUBCRITICAL;
  } else if (supercriticalCount > subcriticalCount && supercriticalCount > criticalCount) {
    return FlowRegime.SUPERCRITICAL;
  } else {
    return FlowRegime.CRITICAL;
  }
}

/**
 * Batch calculate multiple profiles with different parameters
 * @param paramsArray Array of channel parameters
 * @returns Array of calculation results
 */
export function batchCalculateProfiles(
  paramsArray: ChannelParams[]
): CalculationResultWithError[] {
  return paramsArray.map(params => calculateProfileWithErrorHandling(params));
}

/**
 * Calculate reference profiles for critical and normal depths
 * @param params Channel parameters
 * @returns Critical and normal depth profiles
 */
export function calculateReferenceProfiles(
  params: ChannelParams
): { 
  criticalProfile: FlowDepthPoint[]; 
  normalProfile: FlowDepthPoint[]; 
} {
  // Implementation is provided in hydraulics/index.ts
  // This re-export is for consistency in the API
  throw new Error("Not implemented at this level. Use the method from hydraulics/index.ts");
}

/**
 * Configure standard step calculation with custom options
 * @param options Configuration options
 * @returns Configured calculation function
 */
export function configureStandardStepCalculation(options: {
  resolution?: number;
  maxIterations?: number;
  convergenceTolerance?: number;
  useNewtonRaphson?: boolean;
}): (params: ChannelParams) => WaterSurfaceProfileResults {
  return (params: ChannelParams): WaterSurfaceProfileResults => {
    // Apply options to calculation
    if (options.resolution) {
      return calculateHighResolutionProfile(params, options.resolution);
    }
    
    // Default calculation
    return calculateWaterSurfaceProfile(params);
  };
}