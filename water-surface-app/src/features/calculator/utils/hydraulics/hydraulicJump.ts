import { ChannelParams } from '../../types';
import { calculateArea, calculateTopWidth } from './channelGeometry';
import { calculateVelocity, calculateFroudeNumber } from './flowParameters';

// Gravitational acceleration constant
const G = 9.81; // m/s² in metric
const G_IMPERIAL = 32.2; // ft/s² in imperial

/**
 * Interface for hydraulic jump result
 */
export interface HydraulicJumpResult {
  station: number;         // Location of jump
  upstreamDepth: number;   // Upstream depth
  downstreamDepth: number; // Downstream depth
  energyLoss: number;      // Energy loss at jump
  froudeNumber1: number;   // Upstream Froude number
  length: number;          // Approximate length of hydraulic jump
}

/**
 * Checks if a hydraulic jump is possible at the given conditions
 * @param upstreamDepth Upstream water depth
 * @param params Channel parameters
 * @returns True if hydraulic jump is possible, false otherwise
 */
export function isHydraulicJumpPossible(upstreamDepth: number, params: ChannelParams): boolean {
  // Calculate area at upstream depth
  const area = calculateArea(upstreamDepth, params);
  
  // Calculate velocity at upstream depth
  const velocity = calculateVelocity(params.discharge, area);
  
  // Calculate Froude number at upstream depth
  const froudeNumber = calculateFroudeNumber(velocity, upstreamDepth, params);
  
  // Hydraulic jump is possible if upstream flow is supercritical (Fr > 1)
  return froudeNumber > 1;
}

/**
 * Calculates the sequent depth for a hydraulic jump
 * @param upstreamDepth Upstream depth
 * @param params Channel parameters
 * @returns Sequent depth (downstream depth after jump)
 */
export function calculateSequentDepth(upstreamDepth: number, params: ChannelParams): number {
  // Calculate area at upstream depth
  const area1 = calculateArea(upstreamDepth, params);
  
  // Calculate velocity at upstream depth
  const velocity1 = calculateVelocity(params.discharge, area1);
  
  // Calculate Froude number at upstream depth
  const froudeNumber1 = calculateFroudeNumber(velocity1, upstreamDepth, params);
  
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // For rectangular channels, use the standard sequent depth formula
  if (params.channelType === 'rectangular') {
    // Sequent depth: y2 = (y1/2) * (sqrt(1 + 8*Fr1^2) - 1)
    return (upstreamDepth / 2) * (Math.sqrt(1 + 8 * Math.pow(froudeNumber1, 2)) - 1);
  }
  
  // For non-rectangular channels, use momentum equation
  // This requires iterative solution
  
  // Initial guess for sequent depth (based on rectangular approximation)
  let downstreamDepth = (upstreamDepth / 2) * (Math.sqrt(1 + 8 * Math.pow(froudeNumber1, 2)) - 1);
  
  // Tolerance for convergence
  const tolerance = 0.0001;
  let maxIterations = 50;
  let iterations = 0;
  
  // Function to evaluate momentum equation
  // M1 = M2, where M = A^2/T + Q^2/(g*A)
  const evaluateFunction = (y2: number): number => {
    // Calculate properties at upstream depth
    const area1 = calculateArea(upstreamDepth, params);
    const topWidth1 = calculateTopWidth(upstreamDepth, params);
    
    // First moment of area for upstream
    const firstMoment1 = calculateFirstMoment(upstreamDepth, area1, topWidth1, params);
    
    // Momentum flux for upstream
    const momentumFlux1 = Math.pow(params.discharge, 2) / (g * area1);
    
    // Specific force for upstream
    const specificForce1 = firstMoment1 + momentumFlux1;
    
    // Calculate properties at downstream depth
    const area2 = calculateArea(y2, params);
    const topWidth2 = calculateTopWidth(y2, params);
    
    // First moment of area for downstream
    const firstMoment2 = calculateFirstMoment(y2, area2, topWidth2, params);
    
    // Momentum flux for downstream
    const momentumFlux2 = Math.pow(params.discharge, 2) / (g * area2);
    
    // Specific force for downstream
    const specificForce2 = firstMoment2 + momentumFlux2;
    
    // Return difference in specific force
    return specificForce1 - specificForce2;
  };
  
  // Iterative solution
  while (iterations < maxIterations) {
    const error = evaluateFunction(downstreamDepth);
    
    if (Math.abs(error) < tolerance) {
      // Solution found
      break;
    }
    
    // Adjust depth2 based on error
    if (error > 0) {
      downstreamDepth += 0.01;
    } else {
      downstreamDepth -= 0.01;
    }
    
    iterations++;
  }
  
  return downstreamDepth;
}

/**
 * Calculate the first moment of area for momentum equation
 * @param depth Water depth
 * @param area Flow area
 * @param topWidth Top width of water surface
 * @param params Channel parameters
 * @returns First moment of area
 */
function calculateFirstMoment(
  depth: number, 
  area: number, 
  topWidth: number, 
  params: ChannelParams
): number {
  let firstMoment = 0;
  
  switch (params.channelType) {
    case 'rectangular':
      // For rectangular: A * y/2
      firstMoment = area * depth / 2;
      break;
      
    case 'trapezoidal':
      // For trapezoidal: more complex calculation needed
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      
      const bottomWidth = params.bottomWidth;
      
      // For trapezoidal: A * centroid
      // Where centroid is the distance from the bottom to the centroid
      const centroid = depth / 3 * ((2 * bottomWidth) + topWidth) / (bottomWidth + topWidth);
      firstMoment = area * centroid;
      break;
      
    case 'triangular':
      // For triangular: A * y/3
      firstMoment = area * depth / 3;
      break;
      
    case 'circular':
      // For circular: complex calculation
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // Simplified approximation for partially filled circular channels
      const ratio = depth / params.diameter;
      
      // Approximate centroid location (from bottom)
      let centroidFactor = 0;
      if (ratio <= 0.5) {
        centroidFactor = 0.2 * ratio;
      } else if (ratio < 1.0) {
        centroidFactor = 0.1 + 0.3 * ratio;
      } else {
        centroidFactor = 0.5; // Full circle
      }
      
      firstMoment = area * centroidFactor * params.diameter;
      break;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
  
  return firstMoment;
}

/**
 * Calculates the energy loss in a hydraulic jump
 * @param upstreamDepth Upstream depth
 * @param downstreamDepth Downstream depth
 * @returns Energy loss
 */
export function calculateEnergyLoss(upstreamDepth: number, downstreamDepth: number): number {
  // Energy loss formula: E_loss = (y2 - y1)^3 / (4 * y1 * y2)
  return Math.pow(downstreamDepth - upstreamDepth, 3) / (4 * upstreamDepth * downstreamDepth);
}

/**
 * Calculates the approximate length of a hydraulic jump
 * @param upstreamDepth Upstream depth
 * @param downstreamDepth Downstream depth
 * @param froudeNumber1 Upstream Froude number
 * @returns Approximate length of hydraulic jump
 */
export function calculateJumpLength(upstreamDepth: number, downstreamDepth: number, froudeNumber1: number): number {
  // Approximate formula: L = 6 * y2
  return 6 * downstreamDepth;
}

/**
 * Calculates the hydraulic jump details
 * @param upstreamDepth Upstream water depth
 * @param station Station where jump occurs
 * @param params Channel parameters
 * @returns Hydraulic jump details or undefined if jump is not possible
 */
export function calculateHydraulicJump(
  upstreamDepth: number, 
  station: number, 
  params: ChannelParams
): HydraulicJumpResult | undefined {
  // Check if hydraulic jump is possible
  if (!isHydraulicJumpPossible(upstreamDepth, params)) {
    return undefined;
  }
  
  // Calculate upstream properties
  const area1 = calculateArea(upstreamDepth, params);
  const velocity1 = calculateVelocity(params.discharge, area1);
  const froudeNumber1 = calculateFroudeNumber(velocity1, upstreamDepth, params);
  
  // Calculate sequent depth
  const downstreamDepth = calculateSequentDepth(upstreamDepth, params);
  
  // Calculate energy loss
  const energyLoss = calculateEnergyLoss(upstreamDepth, downstreamDepth);
  
  // Calculate jump length
  const jumpLength = calculateJumpLength(upstreamDepth, downstreamDepth, froudeNumber1);
  
  return {
    station,
    upstreamDepth,
    downstreamDepth,
    energyLoss,
    froudeNumber1,
    length: jumpLength
  };
}

/**
 * Classifies the hydraulic jump based on upstream Froude number
 * @param froudeNumber1 Upstream Froude number
 * @returns Classification of hydraulic jump
 */
export function classifyHydraulicJump(froudeNumber1: number): string {
  if (froudeNumber1 < 1) {
    return 'No jump - subcritical flow';
  } else if (froudeNumber1 >= 1 && froudeNumber1 < 1.7) {
    return 'Undular jump';
  } else if (froudeNumber1 >= 1.7 && froudeNumber1 < 2.5) {
    return 'Weak jump';
  } else if (froudeNumber1 >= 2.5 && froudeNumber1 < 4.5) {
    return 'Oscillating jump';
  } else if (froudeNumber1 >= 4.5 && froudeNumber1 < 9.0) {
    return 'Steady jump';
  } else {
    return 'Strong jump';
  }
}