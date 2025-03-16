/**
 * Hydraulics module for water surface profile calculations
 * 
 * This module provides functions for calculating various hydraulic parameters
 * such as water depth, velocity, Froude number, etc. for different channel types.
 */

// Re-export all functions from the hydraulics modules
// Channel Geometry
export {
    calculateArea,
    calculateWetPerimeter,
    calculateTopWidth,
    calculateHydraulicRadius,
    calculateHydraulicDepth,
    calculateMaxDepth
  } from './channelGeometry';
  
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
  } from './flowParameters';
  
  // Critical Flow
  export {
    calculateCriticalDepth,
    calculateCriticalVelocity,
    calculateCriticalEnergy,
    isFlowCritical
  } from './criticalFlow';
  
  // Normal Flow
  export {
    calculateNormalDepth,
    calculateNormalVelocity,
    calculateNormalFroudeNumber,
    classifyChannelSlope,
    determineNormalFlowRegime,
    isFlowUniform
  } from './normalFlow';
  
  // Hydraulic Jump
  export {
    isHydraulicJumpPossible,
    calculateSequentDepth,
    calculateEnergyLoss,
    calculateJumpLength,
    calculateHydraulicJump,
    classifyHydraulicJump
  } from './hydraulicJump';
  
  // Water Surface Profile Calculation
  export {
    calculateWaterSurfaceProfile
  } from './standardStep';
  
  // Export types for use in other components
  export type { FlowDepthPoint, WaterSurfaceProfileResults } from './standardStep';
  export type { HydraulicJumpResult } from './hydraulicJump';