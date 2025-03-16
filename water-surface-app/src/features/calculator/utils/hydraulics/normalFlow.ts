import { ChannelParams } from '../../stores/calculatorSlice';
import { calculateArea, calculateHydraulicRadius } from './channelGeometry';
import { calculateVelocity, calculateFroudeNumber } from './flowParameters';

/**
 * Calculates the normal depth for a given channel, discharge, slope, and roughness
 * Normal depth is the depth of flow in a uniform channel for the given discharge
 * 
 * @param params Channel parameters
 * @returns Normal depth
 */
export function calculateNormalDepth(params: ChannelParams): number {
  // Manning's constant based on unit system
  const k = params.units === 'imperial' ? 1.49 : 1.0;
  
  // Solve for normal depth using iterative approach
  return findNormalDepthIteratively(params, k);
}

/**
 * Iteratively finds the normal depth using the bisection method
 * @param params Channel parameters
 * @param k Manning's constant (1.0 for metric, 1.49 for imperial)
 * @returns Normal depth
 */
function findNormalDepthIteratively(params: ChannelParams, k: number): number {
  // Initial search range
  let yMin = 0.001; // Small positive value to avoid division by zero
  let yMax: number;
  
  // Set yMax based on channel type
  switch (params.channelType) {
    case 'rectangular':
    case 'trapezoidal':
    case 'triangular':
      // Use a reasonable upper limit based on discharge and slope
      yMax = Math.pow(params.discharge, 0.4) / Math.pow(params.channelSlope, 0.2) * 1.5; // Empirical formula
      break;
      
    case 'circular':
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // For circular channels, max depth is the diameter
      yMax = params.diameter;
      break;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
  
  // Tolerance for convergence
  const tolerance = 0.0001;
  let maxIterations = 50;
  let iterations = 0;
  
  // Function to evaluate: F(y) = Q - (k/n) * A * R^(2/3) * S^(1/2)
  // At normal depth, F(y) = 0
  const evaluateFunction = (y: number): number => {
    const area = calculateArea(y, params);
    const hydraulicRadius = calculateHydraulicRadius(y, params);
    
    // Avoid division by zero or negative hydraulic radius
    if (area === 0 || hydraulicRadius <= 0) return Number.MAX_VALUE;
    
    // Calculate discharge using Manning's equation
    const calculatedQ = (k / params.manningN) * area * 
                        Math.pow(hydraulicRadius, 2/3) * 
                        Math.pow(params.channelSlope, 1/2);
    
    return params.discharge - calculatedQ;
  };
  
  // Bisection method
  while ((yMax - yMin) > tolerance && iterations < maxIterations) {
    const yMid = (yMin + yMax) / 2;
    const fMid = evaluateFunction(yMid);
    
    if (Math.abs(fMid) < tolerance) {
      // Found solution
      return yMid;
    }
    
    const fMin = evaluateFunction(yMin);
    
    if (fMin * fMid < 0) {
      // Root is in the left half
      yMax = yMid;
    } else {
      // Root is in the right half
      yMin = yMid;
    }
    
    iterations++;
  }
  
  // Return the midpoint of the final interval
  return (yMin + yMax) / 2;
}

/**
 * Calculates the normal velocity
 * @param params Channel parameters
 * @returns Normal velocity
 */
export function calculateNormalVelocity(params: ChannelParams): number {
  // Calculate normal depth
  const normalDepth = calculateNormalDepth(params);
  
  // Calculate area at normal depth
  const normalArea = calculateArea(normalDepth, params);
  
  // Calculate normal velocity
  return calculateVelocity(params.discharge, normalArea);
}

/**
 * Calculates Froude number at normal depth
 * @param params Channel parameters
 * @returns Froude number at normal depth
 */
export function calculateNormalFroudeNumber(params: ChannelParams): number {
  // Calculate normal depth
  const normalDepth = calculateNormalDepth(params);
  
  // Calculate area at normal depth
  const normalArea = calculateArea(normalDepth, params);
  
  // Calculate normal velocity
  const normalVelocity = calculateVelocity(params.discharge, normalArea);
  
  // Calculate Froude number
  return calculateFroudeNumber(normalVelocity, normalDepth, params);
}

/**
 * Determines the channel slope classification based on normal and critical depths
 * @param params Channel parameters
 * @returns Channel slope classification
 */
export function classifyChannelSlope(params: ChannelParams): 'mild' | 'critical' | 'steep' {
  // Calculate normal depth
  const normalDepth = calculateNormalDepth(params);
  
  // Import here to avoid circular dependency
  const { calculateCriticalDepth } = require('./criticalFlow');
  
  // Calculate critical depth
  const criticalDepth = calculateCriticalDepth(params);
  
  // Compare normal and critical depths to classify slope
  if (normalDepth > criticalDepth) {
    return 'mild';
  } else if (normalDepth < criticalDepth) {
    return 'steep';
  } else {
    return 'critical';
  }
}

/**
 * Determines the flow regime at normal depth
 * @param params Channel parameters
 * @returns Flow regime at normal depth
 */
export function determineNormalFlowRegime(params: ChannelParams): 'subcritical' | 'critical' | 'supercritical' {
  // Calculate Froude number at normal depth
  const froudeNumber = calculateNormalFroudeNumber(params);
  
  // Determine flow regime based on Froude number
  if (froudeNumber < 0.95) {
    return 'subcritical';
  } else if (froudeNumber > 1.05) {
    return 'supercritical';
  } else {
    return 'critical';
  }
}

/**
 * Checks if the flow is uniform at a given depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns True if flow is uniform, false otherwise
 */
export function isFlowUniform(depth: number, params: ChannelParams): boolean {
  // Calculate normal depth
  const normalDepth = calculateNormalDepth(params);
  
  // Flow is uniform if the depth is approximately equal to normal depth
  return Math.abs(depth - normalDepth) / normalDepth < 0.02;
}

/**
 * Calculates the normal depth using the secant method
 * This is an alternative to the bisection method and may converge faster
 * 
 * @param params Channel parameters
 * @returns Normal depth
 */
export function calculateNormalDepthSecant(params: ChannelParams): number {
  // Manning's constant based on unit system
  const k = params.units === 'imperial' ? 1.49 : 1.0;
  
  // Initial guesses
  let y1 = 0.1; // First guess
  let y2 = 1.0; // Second guess
  
  // Function to evaluate: F(y) = Q - (k/n) * A * R^(2/3) * S^(1/2)
  const evaluateFunction = (y: number): number => {
    const area = calculateArea(y, params);
    const hydraulicRadius = calculateHydraulicRadius(y, params);
    
    // Avoid division by zero or negative hydraulic radius
    if (area === 0 || hydraulicRadius <= 0) return Number.MAX_VALUE;
    
    // Calculate discharge using Manning's equation
    const calculatedQ = (k / params.manningN) * area * 
                        Math.pow(hydraulicRadius, 2/3) * 
                        Math.pow(params.channelSlope, 1/2);
    
    return params.discharge - calculatedQ;
  };
  
  // Tolerance for convergence
  const tolerance = 0.0001;
  let maxIterations = 50;
  let iterations = 0;
  
  // Evaluate function at initial guesses
  let f1 = evaluateFunction(y1);
  let f2 = evaluateFunction(y2);
  
  // Secant method iteration
  while (Math.abs(y2 - y1) > tolerance && iterations < maxIterations) {
    // Avoid division by zero
    if (f2 - f1 === 0) break;
    
    // Calculate next approximation
    const y3 = y2 - f2 * (y2 - y1) / (f2 - f1);
    
    // Update values for next iteration
    y1 = y2;
    f1 = f2;
    y2 = y3;
    f2 = evaluateFunction(y2);
    
    // Check if solution is found
    if (Math.abs(f2) < tolerance) {
      return y2;
    }
    
    iterations++;
  }
  
  return y2;
}