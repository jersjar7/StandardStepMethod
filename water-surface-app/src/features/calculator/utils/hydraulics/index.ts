/**
 * Hydraulics module for water surface profile calculations
 * 
 * This module provides functions for calculating various hydraulic parameters
 * such as water depth, velocity, Froude number, etc. for different channel types.
 */

// Re-export all functions from the hydraulics modules
export * from './channelGeometry';
export * from './flowParameters';
export * from './criticalFlow';
export * from './normalFlow';
export * from './hydraulicJump';
export * from './standardStep';

// Export types from standardStep for use in other components
export type { FlowDepthPoint, WaterSurfaceProfileResults } from './standardStep';
export type { HydraulicJumpResult } from './hydraulicJump';

/**
 * Main function to calculate water surface profile
 * 
 * This is the main entry point for calculating water surface profiles.
 * It takes channel parameters and returns the water surface profile.
 * 
 * @param params Channel parameters
 * @returns Water surface profile calculation results
 */
export { calculateWaterSurfaceProfile } from './standardStep';

/**
 * Utility functions for calculating channel geometry
 * 
 * These functions calculate area, wetted perimeter, hydraulic radius, etc.
 * for different channel types.
 */
export {
  calculateArea,
  calculateWetPerimeter,
  calculateTopWidth,
  calculateHydraulicRadius,
  calculateHydraulicDepth,
  calculateMaxDepth
} from './channelGeometry';

/**
 * Utility functions for calculating flow parameters
 *