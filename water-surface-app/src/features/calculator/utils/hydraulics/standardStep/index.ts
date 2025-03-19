/**
 * Standard Step Method for Water Surface Profile Calculations
 * 
 * This module implements the standard step method for calculating
 * water surface profiles in open channels. It provides consistent
 * return types and error handling across all functions.
 */

import { 
  ChannelParams, 
  FlowRegime,
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  FlowDepthPoint,
} from '../../../types';
import { CalculationResultWithError } from '../../../../calculator/types/resultTypes';

// Import core calculation components
import { 
  calculateWaterSurfaceProfile as baseCalculateWaterSurfaceProfile, 
  determineProfileType,
  setupInitialConditions,
  validateCalculationParameters,
  createUniformProfile,
  calculateHighResolutionProfile,
  calculateBidirectionalProfile
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
  CalculationPoint,
  StandardStepOptions
} from './types';

/**
 * Calculation options for the standard step method
 */
export interface StandardStepCalculationOptions {
  resolution?: number;            // Number of calculation points
  tolerance?: number;             // Convergence tolerance
  maxIterations?: number;         // Maximum iterations per step
  includeHydraulicJump?: boolean; // Whether to check for hydraulic jumps
  bidirectional?: boolean;        // Whether to calculate from both directions
  method?: 'simple' | 'newtonRaphson' | 'adaptive'; // Solution method
  onProgress?: (progress: number) => void; // Progress callback
}

// Default options
const defaultOptions: StandardStepCalculationOptions = {
  resolution: 100,
  tolerance: 0.0001,
  maxIterations: 50,
  includeHydraulicJump: true,
  bidirectional: false,
  method: 'adaptive'
};

/**
 * Main export for water surface profile calculation
 * Ensures consistent return type and error handling
 * 
 * @param params Channel parameters
 * @param options Calculation options
 * @returns Water surface profile results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams,
  options: Partial<StandardStepCalculationOptions> = {}
): WaterSurfaceProfileResults {
  // Merge with default options
  const calculationOptions = { 
    ...defaultOptions, 
    ...options 
  };
  
  // Validate calculation parameters
  const validation = validateCalculationParameters(params);
  if (!validation.isValid) {
    throw new Error(validation.message || 'Invalid calculation parameters');
  }
  
  // Apply calculation method based on options
  try {
    // Create modified params with internal options
    const modifiedParams = {
      ...params,
      _tolerance: calculationOptions.tolerance,
      _maxIterations: calculationOptions.maxIterations,
      _method: calculationOptions.method,
      _numSteps: calculationOptions.resolution
    };
    
    // Choose calculation strategy based on options
    if (calculationOptions.bidirectional) {
      return calculateBidirectionalProfile(modifiedParams);
    } else if (calculationOptions.resolution && calculationOptions.resolution > 100) {
      return calculateHighResolutionProfile(modifiedParams, calculationOptions.resolution);
    } else {
      return baseCalculateWaterSurfaceProfile(modifiedParams);
    }
  } catch (error) {
    // Standardize error handling
    throw new Error(
      error instanceof Error 
        ? `Calculation failed: ${error.message}` 
        : 'Calculation failed with unknown error'
    );
  }
}

/**
 * Calculate water surface profile with error handling
 * Returns a standardized result type instead of throwing errors
 * 
 * @param params Channel parameters
 * @param options Calculation options
 * @returns Object with results or error
 */
export function calculateProfileWithErrorHandling(
  params: ChannelParams,
  options: Partial<StandardStepCalculationOptions> = {}
): CalculationResultWithError {
  try {
    // Calculate profile with options
    const results = calculateWaterSurfaceProfile(params, options);
    
    // Return successful result
    return { results };
  } catch (error) {
    // Return error information
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Calculate detailed water surface profile with additional analysis
 * 
 * @param params Channel parameters
 * @param options Calculation options
 * @returns Object with detailed results or error
 */
export function calculateDetailedProfile(
  params: ChannelParams,
  options: Partial<StandardStepCalculationOptions> = {}
): { results?: DetailedWaterSurfaceResults; error?: string } {
  try {
    // Calculate standard profile first
    const results = calculateWaterSurfaceProfile(params, options);
    
    // Perform flow regime analysis
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
    
    // Calculate profile statistics
    const stats = calculateProfileStatistics(results.flowProfile);
    
    // Get profile description
    const profileInfo = getProfileDescription(results.flowProfile, params);
    
    // Create enhanced results
    const detailedResults: DetailedWaterSurfaceResults = {
      ...results,
      profileDescription: profileInfo.description,
      profileDetails: profileInfo.details,
      flowRegime: predominantFlowRegime,
      stats
    };
    
    return { results: detailedResults };
  } catch (error) {
    // Return error information
    return { 
      error: error instanceof Error ? error.message : 'Unknown calculation error' 
    };
  }
}

/**
 * Simplify a profile by reducing the number of points while preserving features
 * 
 * @param profile Original water surface profile
 * @param maxPoints Maximum number of points to include
 * @returns Simplified profile
 */
export function simplifyWaterSurfaceProfile(
  profile: FlowDepthPoint[],
  maxPoints: number = 50
): FlowDepthPoint[] {
  return simplifyProfile(profile, maxPoints);
}

/**
 * Create a uniformly spaced profile by interpolation
 * 
 * @param profile Original water surface profile
 * @param numPoints Number of points in the resulting profile
 * @returns Uniformly spaced profile
 */
export function createUniformWaterSurfaceProfile(
  profile: FlowDepthPoint[],
  numPoints: number = 100
): FlowDepthPoint[] {
  return createUniformProfile(profile, numPoints);
}

/**
 * Check if a profile contains a hydraulic jump
 * 
 * @param profile Water surface profile
 * @param params Channel parameters
 * @returns Whether the profile contains a hydraulic jump
 */
export function hasHydraulicJump(
  profile: FlowDepthPoint[],
  params: ChannelParams
): boolean {
  const jump = detectHydraulicJump(profile, params);
  return jump.occurs;
}

/**
 * Configure standard step calculation
 * Creates a configured calculation function with preset options
 * 
 * @param options Configuration options
 * @returns Configured calculation function
 */
export function configureStandardStepCalculation(
  options: Partial<StandardStepCalculationOptions>
): (params: ChannelParams) => WaterSurfaceProfileResults {
  return (params: ChannelParams): WaterSurfaceProfileResults => {
    return calculateWaterSurfaceProfile(params, options);
  };
}

/**
 * Export calculation types and utilities
 */
export {
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
  
  // Profile analysis
  calculateProfileStatistics,
  getProfileDescription,
  
  // Profile setup and validation
  determineProfileType,
  setupInitialConditions,
  validateCalculationParameters,
  
};

  // Export types
  export type { StepCalculationParams, ProfileCalculationParams, CalculationPoint, StandardStepOptions, FlowTransition };