import { ChannelParams } from '../../../types';
import { calculateArea, calculateWetPerimeter, calculateTopWidth } from '../channelGeometry';
import { calculateVelocity, calculateFroudeNumber, calculateSpecificEnergy, calculateFrictionSlope } from '../flowParameters';
import { StepCalculationParams, CalculationPoint } from './types';

/**
 * Constants
 */
const MAX_ITERATIONS = 50;
const TOLERANCE = 0.0001;
const MIN_DEPTH_ADJUSTMENT = 0.0001;
const MAX_DEPTH_ADJUSTMENT = 0.1;
const DAMPING_FACTOR = 0.7; // For preventing oscillations

/**
 * Calculates properties at a specific depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Calculation properties at the given depth
 */
export function calculatePropertiesAtDepth(
  depth: number,
  params: ChannelParams
): CalculationPoint {
  // Calculate cross-sectional area
  const area = calculateArea(depth, params);
  
  // Calculate wetted perimeter and hydraulic radius
  const wetPerimeter = calculateWetPerimeter(depth, params);
  const hydraulicRadius = area / wetPerimeter;
  
  // Calculate velocity
  const velocity = calculateVelocity(params.discharge, area);
  
  // Calculate Froude number
  const froudeNumber = calculateFroudeNumber(velocity, depth, params);
  
  // Calculate specific energy
  const specificEnergy = calculateSpecificEnergy(depth, velocity, params);
  
  // Calculate friction slope
  const frictionSlope = calculateFrictionSlope(velocity, hydraulicRadius, params.manningN, params.units);
  
  // Calculate top width - calculate it but don't include in return value since not in interface
  // const topWidth = calculateTopWidth(depth, params);
  
  return {
    depth,
    velocity,
    froudeNumber,
    specificEnergy,
    area,
    hydraulicRadius,
    frictionSlope
  };
}

/**
 * Calculates the next depth in the water surface profile using an improved iterative method
 * with adaptive step size and enhanced convergence logic
 * 
 * @param params Step calculation parameters
 * @returns Next depth
 */
export function calculateNextDepth({
  currentX,
  currentY,
  nextX,
  direction,
  params
}: StepCalculationParams): number {
  
  // Calculate properties at current point
  const currentProps = calculatePropertiesAtDepth(currentY, params);
  
  // Calculate bed elevation difference
  const dx = Math.abs(nextX - currentX);
  const dz = params.channelSlope * dx * (direction === 'upstream' ? 1 : -1);
  
  // Initial estimate for next depth based on channel characteristics
  let nextY = estimateInitialDepth(currentY, params, direction);
  
  // Variables to track convergence
  let iterations = 0;
  let prevError = 0;
  let error = 0;
  let consecutiveOscillations = 0;
  let prevDepth = nextY;
  
  // For bisection method if needed
  let upperBound = 0;
  let lowerBound = 0;
  let usingBisection = false;
  
  while (iterations < MAX_ITERATIONS) {
    // Calculate properties at estimated next point
    const nextProps = calculatePropertiesAtDepth(nextY, params);
    
    // Average friction slope (improved method)
    const avgFrictionSlope = calculateAverageFrictionSlope(
      currentProps.frictionSlope, 
      nextProps.frictionSlope
    );
    
    // Head loss due to friction
    const headLoss = avgFrictionSlope * dx;
    
    // Expected energy at next point based on energy equation
    const expectedNextEnergy = currentProps.specificEnergy + dz - headLoss;
    
    // Error in energy
    prevError = error;
    error = nextProps.specificEnergy - expectedNextEnergy;
    
    // Check if solution converged
    if (Math.abs(error) < TOLERANCE) {
      break;
    }
    
    // Store previous depth for comparison
    const tempPrevDepth = prevDepth;
    prevDepth = nextY;
    
    // Check for oscillations (error changes sign with similar magnitude)
    if (iterations > 0 && error * prevError < 0) {
      consecutiveOscillations++;
      
      // If persistent oscillations, switch to bisection method
      if (consecutiveOscillations >= 3 && !usingBisection) {
        usingBisection = true;
        upperBound = Math.max(nextY, tempPrevDepth);
        lowerBound = Math.min(nextY, tempPrevDepth);
      }
    } else {
      consecutiveOscillations = 0;
    }
    
    // Adjust depth based on error and convergence strategy
    if (usingBisection) {
      // Bisection method for difficult convergence cases
      if (error > 0) {
        upperBound = nextY;
      } else {
        lowerBound = nextY;
      }
      nextY = (upperBound + lowerBound) / 2;
    } else {
      // Adaptive adjustment with damping to prevent oscillations
      let adjustmentFactor = calculateAdjustmentFactor(error, prevError, iterations);
      
      // Apply damping if we've seen any oscillations
      if (consecutiveOscillations > 0) {
        adjustmentFactor *= DAMPING_FACTOR;
      }
      
      // Adjust depth based on error
      if (error > 0) {
        nextY += adjustmentFactor;
      } else {
        nextY -= adjustmentFactor;
      }
    }
    
    // Ensure depth remains physically meaningful
    nextY = ensureValidDepth(nextY, currentY, params);
    
    iterations++;
  }
  
  // If we reached max iterations without convergence, return best estimate
  // or consider using another method
  if (iterations >= MAX_ITERATIONS) {
    // Try Newton-Raphson as a fallback for non-converged cases
    try {
      const newtonResult = calculateNextDepthNewtonRaphson({
        currentX,
        currentY,
        nextX,
        direction,
        params
      });
      
      // Check if result is physically reasonable
      if (newtonResult > 0 && Math.abs(newtonResult - currentY) / currentY < 1.5) {
        return newtonResult;
      }
    } catch (error) {
      // Newton method failed, continue with best estimate
    }
  }
  
  return nextY;
}

/**
 * Helper function to estimate initial depth based on channel characteristics
 */
function estimateInitialDepth(
  currentDepth: number, 
  params: ChannelParams, 
  direction: 'upstream' | 'downstream'
): number {
  // For mild slope flowing downstream or steep slope flowing upstream,
  // depth typically decreases
  if ((params.channelSlope < 0.001 && direction === 'downstream') ||
      (params.channelSlope > 0.01 && direction === 'upstream')) {
    return currentDepth * 0.95;
  } else {
    // Otherwise, depth typically increases
    return currentDepth * 1.05;
  }
}

/**
 * Calculate average friction slope with improved weighting
 */
function calculateAverageFrictionSlope(
  currentSlope: number,
  nextSlope: number
): number {
  // Use arithmetic mean for stable flows
  if (Math.abs(nextSlope - currentSlope) / Math.max(currentSlope, 0.00001) < 0.5) {
    return (currentSlope + nextSlope) / 2;
  }
  
  // For more rapidly varying flows, use harmonic mean which gives
  // more weight to the smaller value and provides better stability
  return 2 * currentSlope * nextSlope / (currentSlope + nextSlope + 0.00001);
}

/**
 * Calculate adaptive adjustment factor based on error magnitude and history
 */
function calculateAdjustmentFactor(
  error: number, 
  prevError: number, 
  iteration: number
): number {
  // Base adjustment on error magnitude and trend
  const baseAdjustment = Math.max(
    MIN_DEPTH_ADJUSTMENT,
    Math.min(Math.abs(error) * 0.2, MAX_DEPTH_ADJUSTMENT)
  );
  
  if (iteration === 0) return baseAdjustment;
  
  // Check if error is decreasing
  const errorDecreasing = Math.abs(error) < Math.abs(prevError);
  
  // If error is decreasing, we can be more aggressive
  if (errorDecreasing) {
    return baseAdjustment * 1.2; // Increase step size to accelerate convergence
  } else {
    return baseAdjustment * 0.6; // Reduce step size if error is increasing
  }
}

/**
 * Ensure depth remains physically valid
 */
function ensureValidDepth(
  depth: number, 
  currentDepth: number, 
  params: ChannelParams
): number {
  // Ensure depth is positive
  if (depth <= 0) {
    return 0.01;
  }
  
  // Prevent unrealistically large steps
  const maxChange = Math.max(currentDepth * 0.5, 0.5);
  if (Math.abs(depth - currentDepth) > maxChange) {
    return currentDepth + (depth > currentDepth ? maxChange : -maxChange);
  }
  
  // For circular channels, ensure depth doesn't exceed diameter
  if (params.channelType === 'circular' && params.diameter) {
    return Math.min(depth, params.diameter);
  }
  
  return depth;
}

/**
 * Calculates the next depth using Newton-Raphson method with improved safeguards
 * 
 * @param params Step calculation parameters
 * @returns Next depth
 */
export function calculateNextDepthNewtonRaphson({
  currentX,
  currentY,
  nextX,
  direction,
  params
}: StepCalculationParams): number {
  // Calculate properties at current point
  const currentProps = calculatePropertiesAtDepth(currentY, params);
  
  // Calculate bed elevation difference
  const dx = Math.abs(nextX - currentX);
  const dz = params.channelSlope * dx * (direction === 'upstream' ? 1 : -1);
  
  // Initial guess for next depth
  let nextY = estimateInitialDepth(currentY, params, direction);
  
  // Function to evaluate energy balance: E1 + dz - hf - E2 = 0
  const evaluateEnergyBalance = (y: number): number => {
    const props = calculatePropertiesAtDepth(y, params);
    const avgFrictionSlope = calculateAverageFrictionSlope(
      currentProps.frictionSlope, 
      props.frictionSlope
    );
    const headLoss = avgFrictionSlope * dx;
    
    return currentProps.specificEnergy + dz - headLoss - props.specificEnergy;
  };
  
  // Improved derivative calculation for Newton-Raphson
  const evaluateDerivative = (y: number): number => {
    // Use central difference for better accuracy
    const delta = Math.max(0.001 * y, 0.001);
    const fPlus = evaluateEnergyBalance(y + delta);
    const fMinus = evaluateEnergyBalance(y - delta);
    return (fPlus - fMinus) / (2 * delta);
  };
  
  // Fall back to bisection if needed
  let usingBisection = false;
  let upperBound = 0;
  let lowerBound = 0;
  
  // Track values for convergence checks
  let prevY = nextY;
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
    const f = evaluateEnergyBalance(nextY);
    
    // Check for convergence
    if (Math.abs(f) < TOLERANCE) {
      break;
    }
    
    // Store values for checking oscillation
    prevY = nextY;
    
    if (usingBisection) {
      // Bisection method for difficult cases
      if (f > 0) {
        upperBound = nextY;
      } else {
        lowerBound = nextY;
      }
      nextY = (upperBound + lowerBound) / 2;
    } else {
      // Newton-Raphson method with safeguards
      const df = evaluateDerivative(nextY);
      
      // Check for nearly flat derivative
      if (Math.abs(df) < 1e-6) {
        // Switch to bisection if derivative is too small
        usingBisection = true;
        
        // Set initial bounds for bisection
        if (f > 0) {
          upperBound = nextY;
          lowerBound = nextY * 0.5; // Try a smaller value
        } else {
          lowerBound = nextY;
          upperBound = nextY * 1.5; // Try a larger value
        }
        
        nextY = (upperBound + lowerBound) / 2;
      } else {
        // Standard Newton-Raphson update with damping
        const rawUpdate = f / df;
        
        // Apply damping to prevent large jumps
        const dampedUpdate = Math.sign(rawUpdate) * 
          Math.min(Math.abs(rawUpdate), Math.max(0.1 * nextY, 0.1));
        
        nextY = nextY - dampedUpdate;
      }
    }
    
    // Ensure depth is physically valid
    nextY = ensureValidDepth(nextY, currentY, params);
    
    // Check for oscillations
    if (iterations > 2 && !usingBisection) {
      const newF = evaluateEnergyBalance(nextY);
      
      // If we're oscillating, switch to bisection
      if (f * newF < 0 || Math.abs(nextY - prevY) / prevY < 0.001) {
        usingBisection = true;
        
        // Set bounds based on oscillating values
        upperBound = Math.max(nextY, prevY);
        lowerBound = Math.min(nextY, prevY);
        
        // Start bisection from the middle
        nextY = (upperBound + lowerBound) / 2;
      }
    }
    
    iterations++;
  }
  
  return nextY;
}