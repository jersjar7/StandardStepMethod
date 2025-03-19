/**
 * Hydraulics Module for Water Surface Profile Calculations
 * 
 * This module implements hydraulic calculations including the standard step method
 * for water surface profiles in open channels. It provides standardized types and
 * consistent error handling patterns across all functions.
 */

import { 
  ChannelParams, 
  ProfileType,
  FlowRegime,
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  HydraulicJump,
  FlowDepthPoint
} from '../../types';
import { CalculationResultWithError } from '../../../calculator/types/resultTypes';

// Import calculation components
import { 
  calculateWaterSurfaceProfile as baseCalculateWaterSurfaceProfile, 
  calculateHighResolutionProfile as baseCalculateHighResolutionProfile,
  calculateBidirectionalProfile as baseCalculateBidirectionalProfile,
  validateCalculationParameters
} from './standardStep/profileCalculator';

import { 
  calculateNextDepth, 
  calculatePropertiesAtDepth
} from './standardStep/stepCalculator';

import { 
  detectHydraulicJump,  
  isJumpBetweenPoints
} from './standardStep/jumpDetector';

import {
  calculateCriticalDepth as baseCriticalDepth
} from './criticalFlow';

import {
  calculateNormalDepth as baseNormalDepth
} from './normalFlow';

/**
 * Standardized Calculation Result interface with error handling
 */
interface StandardCalculationResult<T> {
  result?: T;
  error?: string;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Water Surface Profile Calculation Options
 */
export interface CalculationOptions {
  highResolution?: boolean;        // Whether to use high-resolution calculation
  bidirectional?: boolean;         // Whether to calculate from both directions
  includeHydraulicJump?: boolean;  // Whether to check for hydraulic jumps
  onProgress?: ProgressCallback;   // Progress callback
}

// Default calculation options
const defaultOptions: CalculationOptions = {
  highResolution: false,
  bidirectional: false,
  includeHydraulicJump: true
};

/**
 * Calculate water surface profile with standardized return type
 * @param params Channel parameters
 * @param options Calculation options
 * @returns Water surface profile results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams,
  options: Partial<CalculationOptions> = {}
): WaterSurfaceProfileResults {
  // Merge options with defaults
  const calculationOptions = { ...defaultOptions, ...options };
  
  try {
    // Validate parameters
    const validation = validateCalculationParameters(params);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
    
    // Select calculation method based on options
    if (calculationOptions.bidirectional) {
      // Use bidirectional calculation
      return baseCalculateBidirectionalProfile(params);
    } else if (calculationOptions.highResolution) {
      // Use high-resolution calculation
      return baseCalculateHighResolutionProfile(params);
    } else {
      // Use standard calculation
      return baseCalculateWaterSurfaceProfile(params);
    }
  } catch (error) {
    // If an error occurs, throw it for consistent handling upstream
    throw error;
  }
}

/**
 * Calculate water surface profile with error handling
 * @param params Channel parameters
 * @param options Calculation options
 * @returns Water surface profile results or error
 */
export function calculateProfileWithErrorHandling(
  params: ChannelParams,
  options: Partial<CalculationOptions> = {}
): CalculationResultWithError {
  try {
    // Calculate profile
    const results = calculateWaterSurfaceProfile(params, options);
    return { results };
  } catch (error) {
    // Handle error
    return { error: error instanceof Error ? error.message : 'Unknown calculation error' };
  }
}

/**
 * Calculate detailed water surface profile with additional analysis
 * @param params Channel parameters
 * @param options Calculation options
 * @returns Detailed water surface profile results or error
 */
export function calculateDetailedProfile(
  params: ChannelParams,
  options: Partial<CalculationOptions> = {}
): { results?: DetailedWaterSurfaceResults; error?: string } {
  try {
    // Calculate standard profile
    const results = calculateWaterSurfaceProfile(params, options);
    
    // Calculate flow regime
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
    
    // Calculate statistics
    const stats = calculateProfileStatistics(results.flowProfile);
    
    // Create enhanced result
    const detailedResults: DetailedWaterSurfaceResults = {
      ...results,
      profileDescription: getProfileDescription(results),
      profileDetails: getProfileDetails(results),
      flowRegime: predominantFlowRegime,
      stats
    };
    
    return { results: detailedResults };
  } catch (error) {
    // Handle error
    return { error: error instanceof Error ? error.message : 'Unknown calculation error' };
  }
}

/**
 * Calculate critical depth with standardized return type
 * @param params Channel parameters
 * @returns Critical depth
 */
export function calculateCriticalDepth(params: ChannelParams): number {
  return baseCriticalDepth(params);
}

/**
 * Calculate normal depth with standardized return type
 * @param params Channel parameters
 * @returns Normal depth
 */
export function calculateNormalDepth(params: ChannelParams): number {
  return baseNormalDepth(params);
}

/**
 * Get profile description
 * @param results Water surface profile results
 * @returns Profile description
 */
function getProfileDescription(results: WaterSurfaceProfileResults): string {
  // Create a human-readable description based on profile type
  switch (results.profileType) {
    case ProfileType.M1:
      return "M1 - Backwater curve (Mild Slope)";
      
    case ProfileType.M2:
      return "M2 - Drawdown curve approaching critical depth (Mild Slope)";
      
    case ProfileType.M3:
      return "M3 - Supercritical profile (Mild Slope)";
      
    case ProfileType.S1:
      return "S1 - Backwater curve (Steep Slope)";
      
    case ProfileType.S2:
      return "S2 - Drawdown curve (Steep Slope)";
      
    case ProfileType.S3:
      return "S3 - Subcritical profile (Steep Slope)";
      
    case ProfileType.C1:
      return "C1 - Backwater curve (Critical Slope)";
      
    case ProfileType.C2:
      return "C2 - Uniform flow (Critical Slope)";
      
    case ProfileType.C3:
      return "C3 - Drawdown curve (Critical Slope)";
      
    case ProfileType.MIXED:
      return "Mixed Flow Profile";
      
    default:
      return `${results.profileType} Profile`;
  }
}

/**
 * Get detailed profile information
 * @param results Water surface profile results
 * @returns Profile details
 */
function getProfileDetails(results: WaterSurfaceProfileResults): string {
  let details = `Channel Type: ${results.channelType}\n`;
  details += `Critical Depth: ${results.criticalDepth.toFixed(3)} m\n`;
  details += `Normal Depth: ${results.normalDepth.toFixed(3)} m\n`;
  
  // Add hydraulic jump information if present
  if (results.hydraulicJump?.occurs) {
    details += "\nHydraulic Jump:\n";
    details += `  Location: ${results.hydraulicJump.station.toFixed(2)} m\n`;
    details += `  Upstream Depth: ${results.hydraulicJump.upstreamDepth.toFixed(3)} m\n`;
    details += `  Downstream Depth: ${results.hydraulicJump.downstreamDepth.toFixed(3)} m\n`;
    
    if (results.hydraulicJump.energyLoss !== undefined) {
      details += `  Energy Loss: ${results.hydraulicJump.energyLoss.toFixed(3)} m\n`;
    }
  }
  
  return details;
}

/**
 * Calculate profile statistics
 * @param profile Flow depth points
 * @returns Profile statistics
 */
function calculateProfileStatistics(profile: FlowDepthPoint[]): any {
  if (profile.length === 0) {
    return {};
  }
  
  // Calculate min, max, and average values
  let minDepth = profile[0].y;
  let maxDepth = profile[0].y;
  let sumDepth = 0;
  
  let minVelocity = profile[0].velocity;
  let maxVelocity = profile[0].velocity;
  let sumVelocity = 0;
  
  let minFroude = profile[0].froudeNumber;
  let maxFroude = profile[0].froudeNumber;
  let sumFroude = 0;
  
  let subcriticalCount = 0;
  let supercriticalCount = 0;
  
  // Process all points
  for (const point of profile) {
    // Depth
    minDepth = Math.min(minDepth, point.y);
    maxDepth = Math.max(maxDepth, point.y);
    sumDepth += point.y;
    
    // Velocity
    minVelocity = Math.min(minVelocity, point.velocity);
    maxVelocity = Math.max(maxVelocity, point.velocity);
    sumVelocity += point.velocity;
    
    // Froude number
    minFroude = Math.min(minFroude, point.froudeNumber);
    maxFroude = Math.max(maxFroude, point.froudeNumber);
    sumFroude += point.froudeNumber;
    
    // Flow regime
    if (point.froudeNumber < 1) {
      subcriticalCount++;
    } else {
      supercriticalCount++;
    }
  }
  
  // Calculate predominant flow regime
  let predominantFlowRegime = "Mixed Flow";
  if (subcriticalCount > supercriticalCount) {
    predominantFlowRegime = "Subcritical Flow";
  } else if (supercriticalCount > subcriticalCount) {
    predominantFlowRegime = "Supercritical Flow";
  }
  
  // Return statistics
  return {
    minDepth,
    maxDepth,
    avgDepth: sumDepth / profile.length,
    minVelocity,
    maxVelocity,
    avgVelocity: sumVelocity / profile.length,
    minFroude,
    maxFroude,
    avgFroude: sumFroude / profile.length,
    length: profile[profile.length - 1].x - profile[0].x,
    numPoints: profile.length,
    predominantFlowRegime
  };
}

/**
 * Batch calculate multiple profiles
 * @param paramsArray Array of channel parameters
 * @param options Calculation options
 * @returns Array of calculation results
 */
export function batchCalculateProfiles(
  paramsArray: ChannelParams[],
  options: Partial<CalculationOptions> = {}
): CalculationResultWithError[] {
  return paramsArray.map(params => calculateProfileWithErrorHandling(params, options));
}

// Re-export standardized types
export type { ChannelParams, WaterSurfaceProfileResults, DetailedWaterSurfaceResults, FlowDepthPoint, FlowRegime, ProfileType, HydraulicJump };

// Re-export step calculation components
export { calculateNextDepth, calculatePropertiesAtDepth, detectHydraulicJump, isJumpBetweenPoints };