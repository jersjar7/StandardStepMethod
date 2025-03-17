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
  ProfileType, 
  FlowRegime,
  HydraulicJump,
  WaterSurfaceProfileResults,
  CalculationResultWithError,
  ProfileStatistics,
  DetailedWaterSurfaceResults,
  enhanceWithDetails
} from '../../types';

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
export type { 
  FlowDepthPoint, 
  FlowTransition
};

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
  // Call the base implementation
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
  return (params: ChannelParams): WaterSurfaceProfileResults => {
    // Apply options to calculation
    if (options.resolution) {
      return calculateHighResolutionProfile(params, options.resolution);
    }
    
    // Default calculation
    return calculateWaterSurfaceProfile(params);
  };
}