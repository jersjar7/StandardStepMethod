/**
 * Standard Step Method for Water Surface Profile Calculations
 * 
 * This module implements the standard step method for calculating
 * water surface profiles in open channels. It provides a modular approach
 * with separate functionality for profile calculation, step calculation,
 * hydraulic jump detection, and profile classification.
 * 
 * All functions ensure consistent return types using the standardized type system.
 */

import { 
  ChannelParams, 
  FlowDepthPoint,
  HydraulicJump,
  ProfileType,
  FlowRegime,
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  CalculationResultWithError
} from '../../../types';

// Import core calculation components
import { 
  calculateWaterSurfaceProfile as calculateBaseWaterSurfaceProfile, 
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
 * @returns Standardized water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  return calculateBaseWaterSurfaceProfile(params);
}

/**
 * Export calculation functions for direct access
 * All functions maintain consistent return types with the standardized type system
 */
export {
  // Main calculation functions
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
  determineFlowRegime as determinePointFlowRegime, // Renamed to avoid naming conflict
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
 * Returns the standardized WaterSurfaceProfileResults type or an error
 * 
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
 * Returns the standardized DetailedWaterSurfaceResults type
 * 
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
    const stats = calculateProfileStatistics(results.flowProfile);
    
    // Determine flow regime based on Froude numbers
    let predominantFlowRegime = FlowRegime.SUBCRITICAL;
    let subcriticalCount = 0;
    let supercriticalCount = 0;
    
    results.flowProfile.forEach(point => {
      if (point.froudeNumber < 1) subcriticalCount++;
      else supercriticalCount++;
    });
    
    if (supercriticalCount > subcriticalCount) {
      predominantFlowRegime = FlowRegime.SUPERCRITICAL;
    }
    
    // Create detailed results using the standardized type
    const detailedResults: DetailedWaterSurfaceResults = {
      ...results,
      profileDescription: profileDescription.description,
      profileDetails: profileDescription.details,
      flowRegime: predominantFlowRegime,
      stats
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
 * Returns the standardized FlowRegime type
 * 
 * @param results Water surface profile results
 * @returns Predominant flow regime
 */
export function determineOverallFlowRegime(results: WaterSurfaceProfileResults): FlowRegime {
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
 * Returns an array of standardized calculation results
 * 
 * @param paramsArray Array of channel parameters
 * @returns Array of calculation results
 */
export function batchCalculateProfiles(
  paramsArray: ChannelParams[]
): CalculationResultWithError[] {
  return paramsArray.map(params => calculateProfileWithErrorHandling(params));
}

/**
 * Configure standard step calculation with custom options
 * Returns a function that produces standardized results
 * 
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
    // Create modified params with any option overrides
    const modifiedParams = { ...params };
    
    if (options.maxIterations) {
      (modifiedParams as any)._maxIterations = options.maxIterations;
    }
    
    if (options.convergenceTolerance) {
      (modifiedParams as any)._tolerance = options.convergenceTolerance;
    }
    
    if (options.useNewtonRaphson) {
      (modifiedParams as any)._useNewtonRaphson = options.useNewtonRaphson;
    }
    
    if (options.resolution) {
      // Higher resolution means more calculation steps
      (modifiedParams as any)._numSteps = options.resolution;
    }
    
    // Calculate with modified parameters and return standardized results
    return calculateWaterSurfaceProfile(modifiedParams);
  };
}