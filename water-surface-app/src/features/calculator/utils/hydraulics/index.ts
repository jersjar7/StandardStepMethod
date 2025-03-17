/**
 * Hydraulics Module for Water Surface Profile Calculations
 * 
 * This module implements various hydraulic calculations including the standard step method
 * for calculating water surface profiles in open channels. It provides a modular approach
 * with consistent standardized return types throughout the API.
 */

import { 
  ChannelParams, 
  FlowDepthPoint, 
  ProfileType, 
  FlowRegime,
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  CalculationResultWithError,
  enhanceWithDetails
} from '../../types';

// Import core calculation components
import { 
  calculateWaterSurfaceProfile as baseCalculateWaterSurfaceProfile, 
  determineProfileType,
  setupInitialConditions,
  validateCalculationParameters,
  interpolateProfileAtStations,
  createUniformProfile
} from './standardStep/profileCalculator';

import { 
  calculateNextDepth, 
  calculateNextDepthNewtonRaphson,
  calculatePropertiesAtDepth
} from './standardStep/stepCalculator';

import { 
  detectHydraulicJump, 
  detectMultipleJumps,
  incorporateJumpsIntoProfile,
  isJumpBetweenPoints,
  refineJumpLocation
} from './standardStep/jumpDetector';

import {
  detectFlowTransitions,
  determineFlowRegime,
  classifyProfileByTransitions,
  findCriticalDepthLocation,
  findNormalDepthLocation,
  FlowTransition
} from './standardStep/transitionDetector';

import {
  calculateProfileStatistics,
  getProfileDescription,
  simplifyProfile
} from './standardStep/profileUtils';

import { calculateCriticalDepth } from './criticalFlow';
import { calculateNormalDepth } from './normalFlow';

// Export types for use in other components
export type { FlowDepthPoint, FlowTransition };

/**
 * Main export for water surface profile calculation
 * This is the primary function that should be used by the application
 * 
 * @param params Channel parameters including geometry, flow, and roughness
 * @returns Standardized water surface profile results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // Call the base implementation and ensure it returns a standardized type
  return baseCalculateWaterSurfaceProfile(params);
}

/**
 * Calculate a high-resolution water surface profile
 * @param params Channel parameters
 * @param resolution Number of calculation points
 * @returns Standardized water surface profile results
 */
export function calculateHighResolutionProfile(
  params: ChannelParams,
  resolution: number = 200
): WaterSurfaceProfileResults {
  // Create modified params with higher resolution step count
  const modifiedParams = {
    ...params,
    _numSteps: resolution // Internal parameter to override default step count
  };
  
  // Calculate using the standard function
  return calculateWaterSurfaceProfile(modifiedParams as any);
}

/**
 * Calculate a bidirectional profile by analyzing from both ends
 * @param params Channel parameters
 * @returns Standardized water surface profile results
 */
export function calculateBidirectionalProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // First calculate normal and critical depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Create two parameter sets for upstream and downstream calculations
  const downstreamParams = {
    ...params,
    upstreamDepth: normalDepth,
    downstreamDepth: undefined
  };
  
  const upstreamParams = {
    ...params,
    upstreamDepth: undefined,
    downstreamDepth: criticalDepth
  };
  
  // Calculate profiles from both directions
  const downstreamResults = calculateWaterSurfaceProfile(downstreamParams);
  const upstreamResults = calculateWaterSurfaceProfile(upstreamParams);
  
  // Merge results and return standardized results
  // This is a simplified implementation - a real one would combine the profiles intelligently
  if (downstreamResults.flowProfile.length >= upstreamResults.flowProfile.length) {
    return downstreamResults;
  } else {
    return upstreamResults;
  }
}

/**
 * Export calculation functions for direct access with standardized return types
 */
export {
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
  createUniformProfile,
  
  // Basic hydraulic calculations
  calculateCriticalDepth,
  calculateNormalDepth
};

/**
 * Calculate water surface profile with validation and error handling
 * Returns a standardized result type or error
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
 * Returns an enhanced standardized type with additional properties
 * 
 * @param params Channel parameters
 * @returns Detailed water surface profile results or error
 */
export function calculateDetailedProfile(
  params: ChannelParams
): { results?: DetailedWaterSurfaceResults; error?: string } {
  try {
    // First get standard results with standardized type
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
    
    // Return enhanced results with additional information
    // using the standardized DetailedWaterSurfaceResults type
    return { 
      results: enhanceWithDetails(results, {
        profileDescription: profileDescription.description,
        profileDetails: profileDescription.details,
        stats,
        flowRegime: predominantFlowRegime
      })
    };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Batch calculate multiple profiles with different parameters
 * Returns an array of standardized results or errors
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
 * Calculate critical and normal depth profiles for comparison
 * Returns standardized FlowDepthPoint arrays
 * 
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
 * Configure calculation options and return a function that uses standardized types
 * 
 * @param options Configuration options
 * @returns Configured calculation function that returns standardized results
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
    
    // Default calculation with standardized return type
    return calculateWaterSurfaceProfile(params);
  };
}