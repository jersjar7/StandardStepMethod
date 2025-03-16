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

import { ChannelParams } from '../../../stores/calculatorSlice';

// Import core calculation components
import { 
  calculateWaterSurfaceProfile, 
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

// Export types for use in other components
export type { 
  FlowDepthPoint, 
  WaterSurfaceProfileResults,
  StepCalculationParams,
  ProfileCalculationParams,
  CalculationPoint
} from './types';

export { ProfileType, FlowRegime } from './types';
export type { FlowTransition } from './transitionDetector';
export type { ProfileStatistics } from './profileUtils';

/**
 * Main export for water surface profile calculation
 * This is the primary function that should be used by the application
 * 
 * @param params Channel parameters including geometry, flow, and roughness
 * @returns Complete water surface profile calculation results
 */
export function calculateStandardStepProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  return calculateWaterSurfaceProfile(params);
}

/**
 * Export calculation functions for direct access
 */
export {
  // Main calculation functions
  calculateWaterSurfaceProfile,
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
): { results?: WaterSurfaceProfileResults; error?: string } {
  try {
    // Validate parameters
    const validation = validateCalculationParameters(params);
    if (!validation.isValid) {
      return { error: validation.message };
    }
    
    // Calculate profile
    const results = calculateWaterSurfaceProfile(params);
    
    // Perform additional analysis
    const profileDescription = getProfileDescription(results.flowProfile, params);
    const profileStats = calculateProfileStatistics(results.flowProfile);
    
    // Return results with additional information
    return { 
      results: {
        ...results,
        // Add additional properties if needed
        profileDescription: profileDescription.description,
        profileDetails: profileDescription.details,
        stats: profileStats
      } as any
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
): { results?: WaterSurfaceProfileResults; error?: string }[] {
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
  const criticalDepth = 0; // Import and use calculateCriticalDepth from criticalFlow.ts
  const normalDepth = 0;   // Import and use calculateNormalDepth from normalFlow.ts
  
  // Create uniform station spacing
  const numPoints = 100;
  const step = params.length / (numPoints - 1);
  
  // Generate profiles
  const criticalProfile: FlowDepthPoint[] = [];
  const normalProfile: FlowDepthPoint[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const station = i * step;
    
    // Use calculatePropertiesAtDepth for each point
    // This would require importing the relevant functions
    
    // Placeholder for now
    criticalProfile.push({
      x: station,
      y: criticalDepth,
      velocity: 0,
      froudeNumber: 1.0,
      specificEnergy: 0,
      criticalDepth,
      normalDepth
    });
    
    normalProfile.push({
      x: station,
      y: normalDepth,
      velocity: 0,
      froudeNumber: 0,
      specificEnergy: 0,
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
    
    // If using Newton-Raphson method, would need to customize the step calculator
    
    // Default calculation
    return calculateWaterSurfaceProfile(params);
  };
}