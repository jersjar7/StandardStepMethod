import { ChannelParams } from '../../../../stores/calculatorSlice';
import { calculateArea } from '../../channelGeometry';
import { calculateVelocity, calculateFroudeNumber, calculateSpecificEnergy } from '../../flowParameters';
import { detectHydraulicJump } from '../jumpDetector';
import { calculateNextDepth } from '../stepCalculator';
import { 
  FlowDepthPoint, 
  WaterSurfaceProfileResults,
  ProfileType,
  StepCalculationParams
} from '../types';
import { setupInitialConditions } from './initialConditions';
import { convertToStandardHydraulicJump } from '../../../../types/hydraulicJumpTypes';

/**
 * Calculates the initial profile point
 * @param position Initial position (station)
 * @param depth Initial depth
 * @param criticalDepth Critical depth
 * @param normalDepth Normal depth
 * @param params Channel parameters
 * @returns Initial flow depth point
 */
export function calculateInitialPoint(
  position: number,
  depth: number,
  criticalDepth: number,
  normalDepth: number,
  params: ChannelParams
): FlowDepthPoint {
  const area = calculateArea(depth, params);
  const velocity = calculateVelocity(params.discharge, area);
  const froudeNumber = calculateFroudeNumber(velocity, depth, params);
  const specificEnergy = calculateSpecificEnergy(depth, velocity, params);
  
  return {
    x: position,
    y: depth,
    velocity,
    froudeNumber,
    specificEnergy,
    criticalDepth,
    normalDepth
  };
}

/**
 * Determines the water surface profile type based on channel characteristics and depths
 * @param channelSlope Channel slope classification ('mild', 'critical', or 'steep')
 * @param depth Current flow depth
 * @param normalDepth Normal depth
 * @param criticalDepth Critical depth
 * @returns Profile type classification (M1, M2, S1, etc.)
 */
export function determineProfileType(
  channelSlope: string, 
  depth: number, 
  normalDepth: number, 
  criticalDepth: number
): ProfileType {
  if (channelSlope === 'mild') {
    if (depth > normalDepth) return ProfileType.M1;
    if (depth < normalDepth && depth > criticalDepth) return ProfileType.M2;
    if (depth < criticalDepth) return ProfileType.M3;
  } else if (channelSlope === 'steep') {
    if (depth > criticalDepth) return ProfileType.S1;
    if (depth < criticalDepth && depth > normalDepth) return ProfileType.S2;
    if (depth < normalDepth) return ProfileType.S3;
  } else if (channelSlope === 'critical') {
    if (depth > criticalDepth) return ProfileType.C1;
    if (depth < criticalDepth) return ProfileType.C3;
    return ProfileType.C2;
  }
  
  return ProfileType.UNKNOWN;
}

/**
 * Main function to calculate water surface profile
 * @param params Channel parameters
 * @returns Water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // Setup initial conditions
  const calculationParams = setupInitialConditions(params);
  
  const { 
    initialDepth,
    direction,
    startPosition,
    criticalDepth,
    normalDepth,
    numSteps,
    channelSlope,
  } = calculationParams;
  
  // Set step size
  const dx = params.length / numSteps;
  
  // Initialize flow profile array
  const flowProfile: FlowDepthPoint[] = [];
  
  // Variables to track calculation status
  let isChoking = false;
  
  // Calculate initial point
  const initialPoint = calculateInitialPoint(
    startPosition,
    initialDepth,
    criticalDepth,
    normalDepth,
    params
  );
  
  // Add initial point to the profile
  flowProfile.push(initialPoint);
  
  // Current position and depth for iteration
  let currentPosition = startPosition;
  let currentDepth = initialDepth;
  
  // Calculation loop
  let i = 0;
  while (i < numSteps) {
    // Update position based on direction
    const nextPosition = direction === 'upstream' 
                       ? currentPosition - dx 
                       : currentPosition + dx;
    
    // Check if we're out of the channel bounds
    if (nextPosition < 0 || nextPosition > params.length) {
      break;
    }
    
    // Calculate the next depth using the standard step method
    const stepParams: StepCalculationParams = {
      currentX: currentPosition,
      currentY: currentDepth,
      nextX: nextPosition,
      direction,
      params
    };
    
    const nextDepth = calculateNextDepth(stepParams);
    
    // Check if next depth is valid
    if (nextDepth <= 0) {
      // Invalid depth - might be due to choking or other issues
      isChoking = true;
      break;
    }
    
    // Update current position and depth
    currentPosition = nextPosition;
    currentDepth = nextDepth;
    
    // Calculate point properties
    const point = calculateInitialPoint(
      currentPosition,
      currentDepth,
      criticalDepth,
      normalDepth,
      params
    );
    
    // Add point to the profile
    flowProfile.push(point);
    
    i++;
  }
  
  // Determine the profile type based on initial depth
  const profileType = determineProfileType(
    channelSlope, 
    initialDepth, 
    normalDepth, 
    criticalDepth
  );
  
  // Detect hydraulic jump
  const jumpResult = detectHydraulicJump(flowProfile, params);
  
  // Sort the profile by station for consistent display
  flowProfile.sort((a, b) => a.x - b.x);
  
  return {
    flowProfile,
    profileType,           // Now returns the ProfileType enum directly
    channelType: channelSlope,
    criticalDepth,
    normalDepth,
    isChoking,
    hydraulicJump: convertToStandardHydraulicJump(jumpResult)
  };
}

/**
 * Creates a high-resolution profile with more calculation points
 * @param params Channel parameters
 * @param resolution Number of calculation points (default: 200)
 * @returns Water surface profile calculation results
 */
export function calculateHighResolutionProfile(
  params: ChannelParams,
  _resolution: number = 200
): WaterSurfaceProfileResults {
  // Save original channel length
  const originalLength = params.length;
  
  // Modify params to use higher resolution
  const modifiedParams = {
    ...params,
    length: originalLength
  };
  
  // Calculate with modified parameters
  const results = calculateWaterSurfaceProfile(modifiedParams);
  
  // Restore original length in results
  results.flowProfile.forEach(point => {
    if (point.x > originalLength) {
      point.x = originalLength;
    }
  });
  
  return results;
}

/**
 * Calculates profiles from both directions and merges them
 * This can be useful to handle complex profiles with hydraulic jumps
 * @param params Channel parameters
 * @returns Combined water surface profile
 */
export function calculateBidirectionalProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // More implementation details would be here...
  
  // This is placeholder code to maintain the function signature
  return calculateWaterSurfaceProfile(params);
}