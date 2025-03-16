/**
 * Hydraulics module for water surface profile calculations
 * 
 * This module provides functions for calculating various hydraulic parameters
 * such as water depth, velocity, Froude number, etc. for different channel types.
 * All exported types are aligned with the central type definitions.
 */

// Import types from central definition
import {
  ChannelParams,
  FlowDepthPoint,
  HydraulicJump,
  WaterSurfaceProfileResults,
  ProfileType,
  FlowRegime,
  CalculationResult
} from '../../types';

// Import from channel geometry module
import {
  calculateArea,
  calculateWetPerimeter,
  calculateTopWidth,
  calculateHydraulicRadius,
  calculateHydraulicDepth,
  calculateMaxDepth
} from './channelGeometry';

// Import from flow parameters module
import {
  calculateVelocity,
  calculateFroudeNumber,
  calculateSpecificEnergy,
  calculateFrictionSlope,
  calculateChannelFrictionSlope,
  calculateShearStress,
  determineFlowRegime,
  calculateSpecificForce
} from './flowParameters';

// Import from critical flow module
import {
  calculateCriticalDepth,
  calculateCriticalVelocity,
  calculateCriticalEnergy,
  isFlowCritical
} from './criticalFlow';

// Import from normal flow module
import {
  calculateNormalDepth,
  calculateNormalVelocity,
  calculateNormalFroudeNumber,
  classifyChannelSlope,
  determineNormalFlowRegime,
  isFlowUniform
} from './normalFlow';

// Import from hydraulic jump module
import {
  isHydraulicJumpPossible,
  calculateSequentDepth,
  calculateEnergyLoss,
  calculateJumpLength,
  calculateHydraulicJump,
  classifyHydraulicJump,
  HydraulicJumpResult
} from './hydraulicJump';

// Import from standard step module
import {
  calculateWaterSurfaceProfile as calculateStandardStepProfile,
  calculateHighResolutionProfile,
  calculateBidirectionalProfile,
  calculateProfileWithErrorHandling
} from './standardStep/index';

// Re-export all the imported functions
// Channel Geometry
export {
  calculateArea,
  calculateWetPerimeter,
  calculateTopWidth,
  calculateHydraulicRadius,
  calculateHydraulicDepth,
  calculateMaxDepth
};

// Flow Parameters
export {
  calculateVelocity,
  calculateFroudeNumber,
  calculateSpecificEnergy,
  calculateFrictionSlope,
  calculateChannelFrictionSlope,
  calculateShearStress,
  determineFlowRegime,
  calculateSpecificForce
};

// Critical Flow
export {
  calculateCriticalDepth,
  calculateCriticalVelocity,
  calculateCriticalEnergy,
  isFlowCritical
};

// Normal Flow
export {
  calculateNormalDepth,
  calculateNormalVelocity,
  calculateNormalFroudeNumber,
  classifyChannelSlope,
  determineNormalFlowRegime,
  isFlowUniform
};

// Hydraulic Jump
export {
  isHydraulicJumpPossible,
  calculateSequentDepth,
  calculateEnergyLoss,
  calculateJumpLength,
  calculateHydraulicJump,
  classifyHydraulicJump
};

// Export the standard step profile calculation with the shorter name
export const calculateWaterSurfaceProfile = calculateStandardStepProfile;

// Re-export other standard step functions
export {
  calculateHighResolutionProfile,
  calculateBidirectionalProfile,
  calculateProfileWithErrorHandling
};

// Export types
export type { 
  ChannelParams,
  FlowDepthPoint, 
  WaterSurfaceProfileResults,
  HydraulicJump,
  HydraulicJumpResult
};

// Export enums
export { ProfileType, FlowRegime };

/**
 * Converts internal flow points to calculation results for UI display
 * @param flowPoints Array of flow depth points from hydraulic calculations
 * @param params Channel parameters
 * @returns Array of calculation results formatted for UI display
 */
export function convertFlowPointsToResults(
  flowPoints: FlowDepthPoint[],
  params: ChannelParams
): CalculationResult[] {
  return flowPoints.map(point => {
    // Calculate additional parameters required for display
    const area = calculateArea(point.y, params);
    const topWidth = calculateTopWidth(point.y, params);
    const wetPerimeter = calculateWetPerimeter(point.y, params);
    const hydraulicRadius = calculateHydraulicRadius(point.y, params);
    
    return {
      station: point.x,
      depth: point.y,
      velocity: point.velocity,
      area,
      topWidth,
      wetPerimeter,
      hydraulicRadius,
      energy: point.specificEnergy,
      froudeNumber: point.froudeNumber,
      criticalDepth: point.criticalDepth,
      normalDepth: point.normalDepth
    };
  });
}

/**
 * Comprehensive function to run water surface profile calculations
 * @param params Channel parameters
 * @returns Full calculation results with detailed data
 */
export function runComprehensiveCalculation(
  params: ChannelParams
): {
  results: CalculationResult[];
  hydraulicJump?: HydraulicJump;
  profileType: string;
  criticalDepth: number;
  normalDepth: number;
} {
  try {
    // Calculate water surface profile
    const profileResults = calculateWaterSurfaceProfile(params);
    
    // Convert flow points to calculation results
    const calculationResults = convertFlowPointsToResults(
      profileResults.flowProfile,
      params
    );
    
    return {
      results: calculationResults,
      hydraulicJump: profileResults.hydraulicJump,
      profileType: profileResults.profileType,
      criticalDepth: profileResults.criticalDepth,
      normalDepth: profileResults.normalDepth
    };
  } catch (error) {
    // Handle calculation errors
    throw new Error(`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}