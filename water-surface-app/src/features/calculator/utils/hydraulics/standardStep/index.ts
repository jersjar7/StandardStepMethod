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
  StandardWaterSurfaceResults,
  DetailedWaterSurfaceResults,
  CalculationResultWithError,
  FlowDepthPoint,
  ProfileType,
  FlowRegime,
  StandardCalculationResult,
  createStandardResults,
  enhanceWithDetails
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
  findNormalDepthLocation
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
  CalculationPoint,
  FlowTransition
} from './types';

import { calculateCriticalDepth } from '../criticalFlow';
import { calculateNormalDepth } from '../normalFlow';

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
): StandardWaterSurfaceResults {
  const baseResults = calculateBaseWaterSurfaceProfile(params);
  
  // Convert internal flow points to standard calculation results
  const standardResults = createStandardResults(
    baseResults.flowProfile,
    baseResults.profileType as ProfileType,
    baseResults.channelType,
    baseResults.criticalDepth,
    baseResults.normalDepth,
    baseResults.isChoking,
    baseResults.hydraulicJump,
    params
  );
  
  return standardResults;
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
    const baseResults = calculateBaseWaterSurfaceProfile(params);
    
    // Create standard results
    const standardResults = createStandardResults(
      baseResults.flowProfile,
      baseResults.profileType as ProfileType,
      baseResults.channelType,
      baseResults.criticalDepth,
      baseResults.normalDepth,
      baseResults.isChoking,
      baseResults.hydraulicJump,
      params
    );
    
    return { results: standardResults };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Calculate detailed water surface profile with additional analysis
 * @param params Channel parameters
 * @returns Detailed water surface profile calculation results or error
 */
export function calculateDetailedProfile(
  params: ChannelParams
): { results?: DetailedWaterSurfaceResults; error?: string } {
  try {
    // First get standard results
    const baseResults = calculateWaterSurfaceProfile(params);
    
    // Perform additional analysis
    const profileDescription = getProfileDescription(baseResults.results, params);
    const profileStats = calculateProfileStatistics(baseResults.results);
    
    // Enhance with details
    const detailedResults = enhanceWithDetails(baseResults, {
      profileDescription: profileDescription.description,
      profileDetails: profileDescription.details,
      flowRegime: determineOverallFlowRegime(baseResults.results),
      stats: profileStats
    });
    
    return { results: detailedResults };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Determine the overall flow regime based on calculation results
 */
function determineOverallFlowRegime(results: StandardCalculationResult[]): FlowRegime {
  // Count different flow regimes
  let subcriticalCount = 0;
  let supercriticalCount = 0;
  let criticalCount = 0;
  
  results.forEach(result => {
    if (result.froudeNumber < 0.95) subcriticalCount++;
    else if (result.froudeNumber > 1.05) supercriticalCount++;
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
 * Calculate critical and normal depth profiles for comparison
 * @param params Channel parameters
 * @returns Object with critical and normal profiles
 */
export function calculateReferenceProfiles(
  params: ChannelParams
): { 
  criticalProfile: FlowDepthPoint[]; 
  normalProfile: FlowDepthPoint[]; 
} {
  // Get basic depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Create uniform station spacing
  const numPoints = 100;
  const step = params.length / (numPoints - 1);
  
  // Generate profiles
  const criticalProfile: FlowDepthPoint[] = [];
  const normalProfile: FlowDepthPoint[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const station = i * step;
    
    // Calculate properties at critical depth
    const criticalProps = calculatePropertiesAtDepth(criticalDepth, params);
    
    // Calculate properties at normal depth
    const normalProps = calculatePropertiesAtDepth(normalDepth, params);
    
    criticalProfile.push({
      x: station,
      y: criticalDepth,
      velocity: criticalProps.velocity,
      froudeNumber: 1.0, // By definition, Fr = 1 at critical depth
      specificEnergy: criticalProps.specificEnergy,
      criticalDepth,
      normalDepth
    });
    
    normalProfile.push({
      x: station,
      y: normalDepth,
      velocity: normalProps.velocity,
      froudeNumber: normalProps.froudeNumber,
      specificEnergy: normalProps.specificEnergy,
      criticalDepth,
      normalDepth
    });
  }
  
  return { criticalProfile, normalProfile };
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
}) {
  return (params: ChannelParams): StandardWaterSurfaceResults => {
    // Apply options to calculation
    if (options.resolution) {
      const baseResults = calculateHighResolutionProfile(params, options.resolution);
      
      // Convert to standard results
      return createStandardResults(
        baseResults.flowProfile,
        baseResults.profileType as ProfileType,
        baseResults.channelType,
        baseResults.criticalDepth,
        baseResults.normalDepth,
        baseResults.isChoking,
        baseResults.hydraulicJump,
        params
      );
    }
    
    // Default calculation
    return calculateWaterSurfaceProfile(params);
  };
}