import { ChannelParams } from '../../types';
import { 
  HydraulicJump, 
  createHydraulicJump,
  enhanceJumpWithDetails,
  classifyJump
} from '../../types/hydraulicJumpTypes';
import { calculateArea, calculateTopWidth } from './channelGeometry';
import { calculateVelocity, calculateFroudeNumber } from './flowParameters';

// Gravitational acceleration constant
const G = 9.81; // m/s² in metric
const G_IMPERIAL = 32.2; // ft/s² in imperial

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
  
  // For non-rectangular channels, use momentum equation with iterative solution
  
  // Initial guess for sequent depth (based on rectangular approximation)
  let downstreamDepth = (upstreamDepth / 2) * (Math.sqrt(1 + 8 * Math.pow(froudeNumber1, 2)) - 1);
  
  // Ensure initial guess is reasonable
  downstreamDepth = Math.max(downstreamDepth, 1.01 * upstreamDepth);
  
  // Tolerance for convergence
  const tolerance = 0.0001;
  let maxIterations = 50;
  let iterations = 0;
  
  // Calculate momentum function at upstream depth
  const M1 = calculateMomentumFunction(upstreamDepth, params);
  
  // Iterative solution using bisection method
  let y_min = upstreamDepth; // Minimum is upstream depth
  let y_max = downstreamDepth * 2; // Maximum is a reasonable multiple
  
  // Evaluate function at min and max points
  let f_min = calculateMomentumFunction(y_min, params) - M1;
  let f_max = calculateMomentumFunction(y_max, params) - M1;
  
  // If sign is the same, expand the search range until we bracket the root
  while (Math.sign(f_min) === Math.sign(f_max) && iterations < 10) {
    y_max *= 2;
    f_max = calculateMomentumFunction(y_max, params) - M1;
    iterations++;
  }
  
  // Reset iterations counter for main loop
  iterations = 0;
  
  // Check if we found a bracket
  if (Math.sign(f_min) === Math.sign(f_max)) {
    // Couldn't find a bracket, fall back to initial guess
    console.warn('Could not find a sequent depth bracket, using approximation');
    return downstreamDepth;
  }
  
  // Bisection method
  while (iterations < maxIterations) {
    // Calculate midpoint of the interval
    downstreamDepth = (y_min + y_max) / 2;
    
    // Calculate momentum function at midpoint
    const M2 = calculateMomentumFunction(downstreamDepth, params);
    
    // Check convergence
    if (Math.abs(M2 - M1) < tolerance) {
      break;
    }
    
    // Update interval based on function sign
    const f_mid = M2 - M1;
    
    if (Math.sign(f_mid) === Math.sign(f_min)) {
      y_min = downstreamDepth;
      f_min = f_mid;
    } else {
      y_max = downstreamDepth;
      f_max = f_mid;
    }
    
    iterations++;
  }
  
  return downstreamDepth;
}

/**
 * Calculates the momentum function for a hydraulic jump
 * M = A²/T + Q²/(g*A)
 * Where:
 * - A is the cross-sectional area
 * - T is the top width
 * - Q is the discharge
 * - g is gravitational acceleration
 * 
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Momentum function value
 */
function calculateMomentumFunction(depth: number, params: ChannelParams): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // Calculate cross-sectional area, top width and first moment of area
  const area = calculateArea(depth, params);
  const topWidth = calculateTopWidth(depth, params);
  
  // Avoid division by zero
  if (area <= 0 || topWidth <= 0) {
    return 0;
  }
  
  // Calculate hydrostatic pressure force term (A²/T)
  const hydrostaticTerm = Math.pow(area, 2) / topWidth;
  
  // Calculate momentum flux term (Q²/(g*A))
  const momentumFluxTerm = Math.pow(params.discharge, 2) / (g * area);
  
  // Calculate total momentum function M = A²/T + Q²/(g*A)
  return hydrostaticTerm + momentumFluxTerm;
}

/**
 * Calculates the first moment of area with respect to the water surface
 * This is used for momentum calculations in non-rectangular channels
 * 
 * @param depth Water depth
 * @param params Channel parameters
 * @returns First moment of area
 */
function calculateFirstMomentOfArea(depth: number, params: ChannelParams): number {
  const area = calculateArea(depth, params);
  
  // Calculate centroid distance from water surface
  let centroidDepth: number;
  
  switch (params.channelType) {
    case 'rectangular':
      // For rectangular channel: depth/2
      centroidDepth = depth / 2;
      break;
      
    case 'trapezoidal':
      // For trapezoidal channel with bottom width b and top width T
      const bottomWidth = params.bottomWidth;
      const topWidth = calculateTopWidth(depth, params);
      
      // Centroid formula for trapezoid: h(2b + T)/(3(b + T))
      centroidDepth = depth * (2 * bottomWidth + topWidth) / (3 * (bottomWidth + topWidth));
      break;
      
    case 'triangular':
      // For triangular channel: depth/3
      centroidDepth = depth / 3;
      break;
      
    case 'circular':
      // For circular channel (partially filled)
      // This is an approximation based on the depth ratio
      const diameter = params.diameter || 1;
      const depthRatio = depth / diameter;
      
      if (depthRatio <= 0.5) {
        // For shallow depth
        centroidDepth = 0.375 * depth;
      } else if (depthRatio >= 1.0) {
        // Full circle
        centroidDepth = 0.5 * diameter;
      } else {
        // Intermediate depth - approximation
        centroidDepth = depth * (0.375 + 0.125 * (2 * depthRatio - 1));
      }
      break;
      
    default:
      // Default approximation
      centroidDepth = depth / 2;
  }
  
  // First moment of area = Area * centroid depth
  return area * centroidDepth;
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
export function calculateJumpLength(
  upstreamDepth: number, 
  downstreamDepth: number, 
  froudeNumber1: number
): number {
  // Use a more accurate empirical formula based on Froude number
  if (froudeNumber1 < 1.7) {
    // Undular jump
    return 5 * downstreamDepth; 
  } else if (froudeNumber1 < 4.5) {
    // Weak or oscillating jump
    return 6 * downstreamDepth;
  } else {
    // Steady or strong jump
    return 7 * downstreamDepth;
  }
}

/**
 * Calculate the efficiency of the hydraulic jump
 * @param energyLoss Energy loss at the jump
 * @param upstreamEnergy Specific energy upstream of the jump
 * @returns Jump efficiency as a ratio (0-1)
 */
function calculateJumpEfficiency(energyLoss: number, upstreamEnergy: number): number {
  if (upstreamEnergy <= 0) return 0;
  // Efficiency = 1 - E_loss/E1
  return 1 - (energyLoss / upstreamEnergy);
}

/**
 * Calculates the hydraulic jump details
 * @param upstreamDepth Upstream water depth
 * @param station Station where jump occurs
 * @param params Channel parameters
 * @returns Hydraulic jump details or minimal jump if jump is not possible
 */
export function calculateHydraulicJump(
  upstreamDepth: number, 
  station: number, 
  params: ChannelParams
): HydraulicJump {
  // Check if hydraulic jump is possible
  if (!isHydraulicJumpPossible(upstreamDepth, params)) {
    return createHydraulicJump(); // Returns { occurs: false }
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
  
  // Calculate sequent depth ratio
  const sequentDepthRatio = downstreamDepth / upstreamDepth;
  
  // Calculate specific energy upstream
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  const upstreamEnergy = upstreamDepth + (Math.pow(velocity1, 2) / (2 * g));
  
  // Calculate jump efficiency
  const efficiency = calculateJumpEfficiency(energyLoss, upstreamEnergy);
  
  // Classify jump based on Froude number
  const jumpType = classifyJump(froudeNumber1);
  
  // Create basic hydraulic jump
  const basicJump = createHydraulicJump({
    station,
    upstreamDepth,
    downstreamDepth,
    energyLoss,
    froudeNumber1,
    length: jumpLength,
    jumpType
  });
  
  // If the jump occurs, enhance it with calculation details
  if (basicJump.occurs) {
    return enhanceJumpWithDetails(basicJump, {
      sequentDepthRatio,
      efficiency
    });
  }
  
  return basicJump;
}