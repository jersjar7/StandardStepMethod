import { ChannelParams } from '../../../types';
import { calculateArea, calculateWetPerimeter } from '../channelGeometry';
import { calculateVelocity, calculateSpecificEnergy, calculateFrictionSlope } from '../flowParameters';
import { StepCalculationParams, CalculationPoint } from './types';

/**
 * Constants
 */
const MAX_ITERATIONS = 50;
const TOLERANCE = 0.0001;
const DEFAULT_DEPTH_ADJUSTMENT = 0.01;

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
  // Calculate basic hydraulic properties
  const area = calculateArea(depth, params);
  const hydraulicRadius = calculateArea(depth, params) / calculateWetPerimeter(depth, params);
  const velocity = calculateVelocity(params.discharge, area);
  const specificEnergy = calculateSpecificEnergy(depth, velocity, params);
  const frictionSlope = calculateFrictionSlope(velocity, hydraulicRadius, params.manningN, params.units);
  
  // Calculate Froude number
  // Note: We need to import calculateFroudeNumber for this,
  // but for simplicity, we'll use velocity and depth as an approximation
  const froudeNumber = 0; // Placeholder, needs to be replaced with actual Froude calculation
  
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
 * Calculates the next depth in the water surface profile
 * Uses the standard step method to solve the energy equation
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
  
  // Initial estimate for next depth
  let nextY = currentY;
  
  // For mild slope flowing downstream or steep slope flowing upstream,
  // depth typically decreases
  if ((params.channelSlope < 0.001 && direction === 'downstream') ||
      (params.channelSlope > 0.01 && direction === 'upstream')) {
    nextY = currentY * 0.95;
  } else {
    // Otherwise, depth typically increases
    nextY = currentY * 1.05;
  }
  
  // Ensure depth remains positive
  if (nextY <= 0) {
    nextY = 0.01;
  }
  
  // Iterative solution
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
    // Calculate properties at estimated next point
    const nextProps = calculatePropertiesAtDepth(nextY, params);
    
    // Average friction slope
    const avgFrictionSlope = (currentProps.frictionSlope + nextProps.frictionSlope) / 2;
    
    // Head loss due to friction
    const headLoss = avgFrictionSlope * dx;
    
    // Expected energy at next point based on energy equation
    const expectedNextEnergy = currentProps.specificEnergy + dz - headLoss;
    
    // Error in energy
    const error = nextProps.specificEnergy - expectedNextEnergy;
    
    // Check if solution converged
    if (Math.abs(error) < TOLERANCE) {
      break;
    }
    
    // Adjust depth based on error
    if (error > 0) {
      // If energy is too high, increase depth
      nextY += DEFAULT_DEPTH_ADJUSTMENT;
    } else {
      // If energy is too low, decrease depth
      nextY -= DEFAULT_DEPTH_ADJUSTMENT;
    }
    
    // Ensure depth remains positive
    if (nextY <= 0) {
      nextY = 0.01;
    }
    
    iterations++;
  }
  
  return nextY;
}

/**
 * Alternative implementation of calculateNextDepth using Newton-Raphson method
 * This method generally converges faster than the simple iterative method
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
  let nextY = currentY;
  
  // Make a reasonable initial guess based on slope and direction
  if ((params.channelSlope < 0.001 && direction === 'downstream') ||
      (params.channelSlope > 0.01 && direction === 'upstream')) {
    nextY = currentY * 0.95;
  } else {
    nextY = currentY * 1.05;
  }
  
  // Function to evaluate energy balance: E1 + dz - hf - E2 = 0
  const evaluateEnergyBalance = (y: number): number => {
    const props = calculatePropertiesAtDepth(y, params);
    const avgFrictionSlope = (currentProps.frictionSlope + props.frictionSlope) / 2;
    const headLoss = avgFrictionSlope * dx;
    
    return currentProps.specificEnergy + dz - headLoss - props.specificEnergy;
  };
  
  // Derivative approximation for Newton-Raphson
  const evaluateDerivative = (y: number): number => {
    const delta = 0.001 * y; // Small delta for numerical derivative
    return (evaluateEnergyBalance(y + delta) - evaluateEnergyBalance(y)) / delta;
  };
  
  // Newton-Raphson iteration
  let iterations = 0;
  while (iterations < MAX_ITERATIONS) {
    const f = evaluateEnergyBalance(nextY);
    
    // Check for convergence
    if (Math.abs(f) < TOLERANCE) {
      break;
    }
    
    const df = evaluateDerivative(nextY);
    
    // Avoid division by very small numbers
    if (Math.abs(df) < 1e-6) {
      // Use simpler iterative approach if derivative is too small
      nextY += f > 0 ? -DEFAULT_DEPTH_ADJUSTMENT : DEFAULT_DEPTH_ADJUSTMENT;
    } else {
      // Newton-Raphson update
      nextY = nextY - f / df;
    }
    
    // Ensure depth remains positive
    if (nextY <= 0) {
      nextY = 0.01;
    }
    
    iterations++;
  }
  
  return nextY;
}