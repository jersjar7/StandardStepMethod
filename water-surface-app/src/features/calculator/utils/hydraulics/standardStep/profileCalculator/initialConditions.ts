import { ChannelParams } from '../../../../types';
import { calculateCriticalDepth } from '../../criticalFlow';
import { calculateNormalDepth, classifyChannelSlope } from '../../normalFlow';
import { ProfileCalculationParams } from '../types';

/**
 * Sets up initial conditions for profile calculation
 * @param params Channel parameters
 * @returns ProfileCalculationParams with initial conditions
 */
export function setupInitialConditions(
  params: ChannelParams
): ProfileCalculationParams {
  // Calculate critical and normal depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Classify the channel slope
  const channelSlope = classifyChannelSlope(params);
  
  // Default number of steps
  const numSteps = 100;
  
  // Set up initial conditions based on channel type and boundary conditions
  let initialDepth: number;
  let direction: 'upstream' | 'downstream';
  let startPosition: number;
  
  if (params.downstreamDepth !== undefined) {
    // If downstream depth is specified, use it and calculate upstream
    initialDepth = params.downstreamDepth;
    direction = 'upstream';
    startPosition = params.length;
  } else if (params.upstreamDepth !== undefined) {
    // If upstream depth is specified, use it and calculate downstream
    initialDepth = params.upstreamDepth;
    direction = 'downstream';
    startPosition = 0;
  } else {
    // Default behavior based on channel type
    if (channelSlope === 'mild') {
      // For mild slopes, start from downstream with critical depth as control
      initialDepth = criticalDepth;
      direction = 'upstream';
      startPosition = params.length;
    } else {
      // For steep slopes, start from upstream with normal depth as control
      initialDepth = normalDepth;
      direction = 'downstream';
      startPosition = 0;
    }
  }
  
  return {
    initialDepth,
    direction,
    startPosition,
    criticalDepth,
    normalDepth,
    numSteps,
    channelSlope,
    params
  };
}

/**
 * Validates parameters and handles edge cases
 * @param params Channel parameters
 * @returns Validation result with error message if invalid
 */
export function validateCalculationParameters(
  params: ChannelParams
): { isValid: boolean; message?: string } {
  // Check for negative or zero values
  if (params.discharge <= 0) {
    return { isValid: false, message: "Discharge must be positive" };
  }
  
  if (params.channelSlope <= 0) {
    return { isValid: false, message: "Channel slope must be positive" };
  }
  
  if (params.manningN <= 0) {
    return { isValid: false, message: "Manning's roughness must be positive" };
  }
  
  if (params.length <= 0) {
    return { isValid: false, message: "Channel length must be positive" };
  }
  
  // Check channel-specific parameters
  switch (params.channelType) {
    case 'rectangular':
    case 'trapezoidal':
      if (params.bottomWidth <= 0) {
        return { isValid: false, message: "Bottom width must be positive" };
      }
      break;
      
    case 'trapezoidal':
    case 'triangular':
      if (!params.sideSlope || params.sideSlope <= 0) {
        return { isValid: false, message: "Side slope must be positive" };
      }
      break;
      
    case 'circular':
      if (!params.diameter || params.diameter <= 0) {
        return { isValid: false, message: "Diameter must be positive" };
      }
      break;
  }
  
  // Check boundary conditions
  if (params.upstreamDepth !== undefined && params.upstreamDepth <= 0) {
    return { isValid: false, message: "Upstream depth must be positive" };
  }
  
  if (params.downstreamDepth !== undefined && params.downstreamDepth <= 0) {
    return { isValid: false, message: "Downstream depth must be positive" };
  }
  
  return { isValid: true };
}

/**
 * Determines the most appropriate starting condition based on channel characteristics
 * @param params Channel parameters
 * @returns Optimal starting position and depth
 */
export function determineOptimalStartingCondition(
  params: ChannelParams
): { position: number; depth: number; direction: 'upstream' | 'downstream' } {
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  const channelSlope = classifyChannelSlope(params);
  
  // Basic control section logic:
  // - For subcritical flow, control is at downstream end
  // - For supercritical flow, control is at upstream end
  
  // Check boundary conditions first
  if (params.downstreamDepth !== undefined) {
    return {
      position: params.length,
      depth: params.downstreamDepth,
      direction: 'upstream'
    };
  }
  
  if (params.upstreamDepth !== undefined) {
    return {
      position: 0,
      depth: params.upstreamDepth,
      direction: 'downstream'
    };
  }
  
  // Default behavior based on channel slope
  if (channelSlope === 'mild') {
    return {
      position: params.length,
      depth: criticalDepth,
      direction: 'upstream'
    };
  } else if (channelSlope === 'steep') {
    return {
      position: 0,
      depth: normalDepth,
      direction: 'downstream'
    };
  } else {
    // Critical slope
    return {
      position: 0,
      depth: normalDepth, // For critical slope, normalDepth = criticalDepth
      direction: 'downstream'
    };
  }
}

/**
 * Calculates the optimal number of calculation steps based on channel length
 * @param params Channel parameters
 * @returns Recommended number of calculation steps
 */
export function calculateOptimalStepCount(params: ChannelParams): number {
  // Base calculation on channel length and minimum step size
  const minStepSize = 0.1; // meters
  const recommendedSteps = Math.ceil(params.length / minStepSize);
  
  // Constrain between reasonable min and max values
  const minSteps = 20;
  const maxSteps = 500;
  
  return Math.min(Math.max(recommendedSteps, minSteps), maxSteps);
}